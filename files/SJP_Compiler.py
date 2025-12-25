#!/usr/bin/env python3
import re
import json
import sys
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional
import importlib.util


class SJPParser:
    def __init__(self, content: str):
        self.content = content
        self.templates = {}
        self.items = {}
        
    def remove_comments(self, text: str) -> str:
        text = re.sub(r'\\!.*?(?=\n|$)', '', text)
        text = re.sub(r'\\\\.*?\\\\', '', text, flags=re.DOTALL)
        return text
    
    def parse_type_filter(self, type_str: str) -> Dict[str, Any]:
        result = {'base_types': [], 'filters': []}
        or_parts = type_str.split('|')
        
        for part in or_parts:
            part = part.strip()
            if '&' in part:
                parts = [p.strip() for p in part.split('&')]
                base_type = parts[0]
                filters = parts[1:]
            else:
                base_type = part
                filters = []
            
            type_map = {
                'int': 'integer', 'integer': 'integer',
                'float': 'decimal', 'decimal': 'decimal',
                'string': 'string', 'quoted_string': 'string',
                'unquoted_string': 'unquoted_string',
                'bool': 'boolean', 'boolean': 'boolean',
                'list': 'list'
            }
            
            normalized_type = type_map.get(base_type, base_type)
            result['base_types'].append({'type': normalized_type, 'filters': []})
        
        return result
    
    def parse_value(self, value_str: str) -> Any:
        value_str = value_str.strip()
        
        if value_str.lower() in ('true', 'false'):
            return value_str.lower() == 'true'
        
        if value_str.lower() in ('none', 'null'):
            return None
        
        if value_str.startswith('[') and value_str.endswith(']'):
            list_content = value_str[1:-1].strip()
            if not list_content:
                return []
            
            items = []
            depth = 0
            current = ""
            in_string = False
            string_char = None
            
            for char in list_content:
                if char in ('"', "'") and (not in_string or string_char == char):
                    if not in_string:
                        in_string = True
                        string_char = char
                    else:
                        in_string = False
                        string_char = None
                
                if not in_string:
                    if char in ('[', '{'):
                        depth += 1
                    elif char in (']', '}'):
                        depth -= 1
                    elif char == ',' and depth == 0:
                        items.append(self.parse_value(current.strip()))
                        current = ""
                        continue
                
                current += char
            
            if current.strip():
                items.append(self.parse_value(current.strip()))
            
            return items
        
        if (value_str.startswith('"') and value_str.endswith('"')) or \
           (value_str.startswith("'") and value_str.endswith("'")):
            return value_str[1:-1]
        
        try:
            if '.' not in value_str:
                return int(value_str)
        except ValueError:
            pass
        
        try:
            return float(value_str)
        except ValueError:
            pass
        
        return value_str
    
    def parse(self):
        clean_content = self.remove_comments(self.content)
        
        template_pattern = r'item\s+#template:(\w+)\s*\[(.*?)\]'
        for match in re.finditer(template_pattern, clean_content, re.DOTALL):
            template_id = match.group(1)
            template_body = match.group(2)
            self.parse_template(template_id, template_body)
        
        item_pattern = r'item(?::(\w+))?\s+(\w+)\s*\[(.*?)\]'
        for match in re.finditer(item_pattern, clean_content, re.DOTALL):
            if match.group(0).startswith('item #template'):
                continue
            
            template_ref = match.group(1)
            item_id = match.group(2)
            item_body = match.group(3)
            self.parse_item(item_id, item_body, template_ref)
        
        execute_pattern = r'execute:(cmd|py)\s*\[(.*?)\]'
        for match in re.finditer(execute_pattern, clean_content, re.DOTALL):
            exec_type = match.group(1)
            exec_body = match.group(2).strip()
            self.execute_block(exec_type, exec_body)
        
        output_pattern = r'output\s*\[(.*?)\]'
        for match in re.finditer(output_pattern, clean_content, re.DOTALL):
            output_body = match.group(1)
            self.parse_output(output_body)
    
    def parse_template(self, template_id: str, body: str):
        labels = {}
        labels_match = re.search(r'labels\s*\{(.*?)\}', body, re.DOTALL)
        if labels_match:
            labels_body = labels_match.group(1)
            label_pattern = r'(\w+)\s*:\s*([^\\]+?)(?=\s*\w+\s*:|$)'
            for match in re.finditer(label_pattern, labels_body, re.DOTALL):
                label_name = match.group(1)
                label_type = match.group(2).strip().rstrip(',')
                label_type = re.sub(r'\\!.*$', '', label_type).strip()
                labels[label_name] = self.parse_type_filter(label_type)
        
        self.templates[template_id] = labels
    
    def parse_item(self, item_id: str, body: str, template_ref: Optional[str] = None):
        content_match = re.search(r'\{(.*?)\}', body, re.DOTALL)
        if not content_match:
            return
        
        content = content_match.group(1).strip()
        
        if template_ref and template_ref in self.templates:
            values = self.parse_item_values(content)
            template = self.templates[template_ref]
            item_data = {}
            template_keys = list(template.keys())
            
            for i, value in enumerate(values):
                if i < len(template_keys):
                    item_data[template_keys[i]] = value
            
            self.items[item_id] = {'template': template_ref, 'data': item_data}
        else:
            item_data = {}
            label_pattern = r'(\w+)\s*:\s*(\w+(?:\s*&[^:]+)?)\s*:\s*([^,\n]+?)(?=\s*,|\s*\n|\s*$)'
            
            for match in re.finditer(label_pattern, content, re.DOTALL):
                label = match.group(1)
                type_str = match.group(2).strip()
                value_str = match.group(3).strip()
                
                item_data[label] = {
                    'type': self.parse_type_filter(type_str),
                    'value': self.parse_value(value_str)
                }
            
            self.items[item_id] = {'template': None, 'data': item_data}
    
    def parse_item_values(self, content: str) -> List[Any]:
        values = []
        depth = 0
        current = ""
        in_string = False
        string_char = None
        
        for char in content:
            if char in ('"', "'") and (not in_string or string_char == char):
                if not in_string:
                    in_string = True
                    string_char = char
                else:
                    in_string = False
                    string_char = None
            
            if not in_string:
                if char in ('[', '{'):
                    depth += 1
                elif char in (']', '}'):
                    depth -= 1
                elif char in (',', '\n') and depth == 0:
                    if current.strip():
                        values.append(self.parse_value(current.strip()))
                    current = ""
                    continue
            
            current += char
        
        if current.strip():
            values.append(self.parse_value(current.strip()))
        
        return values
    
    def execute_block(self, exec_type: str, body: str):
        if exec_type == 'cmd':
            try:
                result = subprocess.run(body, shell=True, capture_output=True, text=True)
                if result.stdout:
                    print(result.stdout, end='')
                if result.stderr:
                    print(result.stderr, end='', file=sys.stderr)
            except Exception as e:
                print(f"Error: {e}", file=sys.stderr)
        
        elif exec_type == 'py':
            try:
                exec(body)
            except Exception as e:
                print(f"Error: {e}", file=sys.stderr)
    
    def parse_output(self, body: str):
        output_data = {}
        
        type_match = re.search(r'type\s*:\s*(\w+)', body)
        if type_match:
            output_data['type'] = type_match.group(1)
        
        value_match = re.search(r'value\s*:\s*(.+?)(?=\s*\n\s*\w+\s*:|$)', body, re.DOTALL)
        if value_match:
            output_data['value'] = self.parse_value(value_match.group(1).strip())
        
        id_match = re.search(r'id\s*:\s*(\w+)', body)
        if id_match:
            output_data['id'] = id_match.group(1)
        
        self.execute_output(output_data)
    
    def execute_output(self, output_data: Dict[str, Any]):
        if output_data.get('type') == 'string':
            value = output_data.get('value', '')
            value = value.replace('\\n', '\n')
            print(value)
        elif output_data.get('type') == 'item':
            item_id = output_data.get('id')
            if item_id in self.items:
                item = self.items[item_id]
                output = []
                
                if item['template'] and item['template'] in self.templates:
                    template = self.templates[item['template']]
                    type_info = {}
                    for label, type_def in template.items():
                        type_info[label] = type_def['base_types'][0]['type'] if type_def['base_types'] else 'unknown'
                    output.append(type_info)
                
                output.append(item['data'])
                print(json.dumps(output, indent=2))


def find_detector_files(start_path: Path = Path('.')) -> List[Path]:
    return list(start_path.rglob('SJP_Detector.py'))


def load_sjp_files_from_detector(detector_path: Path) -> List[Path]:
    try:
        spec = importlib.util.spec_from_file_location("SJP_Detector", detector_path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            if hasattr(module, 'SJP') and hasattr(module.SJP, 'files'):
                return module.SJP.files()
    except Exception as e:
        print(f"Error loading {detector_path}: {e}", file=sys.stderr)
    
    return []


def compile_sjp_file(file_path: Path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        parser = SJPParser(content)
        parser.parse()
        
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}", file=sys.stderr)
    except Exception as e:
        print(f"Error: {file_path}: {e}", file=sys.stderr)


def main():
    detector_files = find_detector_files()
    
    if not detector_files:
        print("Error: No SJP_Detector.py found", file=sys.stderr)
        return
    
    all_sjp_files = []
    for detector in detector_files:
        sjp_files = load_sjp_files_from_detector(detector)
        all_sjp_files.extend(sjp_files)
    
    if not all_sjp_files:
        print("Error: No SJP files specified", file=sys.stderr)
        return
    
    for sjp_file in all_sjp_files:
        compile_sjp_file(sjp_file)


if __name__ == "__main__":
    main()