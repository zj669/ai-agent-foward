import React from 'react';
import { Input } from 'antd';

interface UserInputEditorProps {
    value: string;
    onChange: (value: string) => void;
}

const UserInputEditor: React.FC<UserInputEditorProps> = ({ value, onChange }) => {
    return (
        <div style={{ padding: '12px 0' }}>
            <Input.TextArea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="用户输入内容"
                autoSize={{ minRows: 4, maxRows: 12 }}
                showCount
            />
        </div>
    );
};

export default UserInputEditor;
