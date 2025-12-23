import React, { useState, useEffect } from 'react';
import { Input, Empty, Alert } from 'antd';

interface VariablesEditorProps {
    value: Record<string, any>;
    onChange: (value: Record<string, any>) => void;
}

const VariablesEditor: React.FC<VariablesEditorProps> = ({ value, onChange }) => {
    const [jsonStr, setJsonStr] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setJsonStr(JSON.stringify(value || {}, null, 2));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setJsonStr(newValue);

        try {
            const parsed = JSON.parse(newValue);
            onChange(parsed);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            // Don't verify change up to parent if invalid JSON
        }
    };

    return (
        <div style={{ padding: '12px 0' }}>
            {error && (
                <Alert type="error" message="Invalid JSON" description={error} showIcon style={{ marginBottom: 8 }} />
            )}
            <Input.TextArea
                value={jsonStr}
                onChange={handleChange}
                autoSize={{ minRows: 6, maxRows: 16 }}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
                placeholder="{}"
            />
        </div>
    );
};

export default VariablesEditor;
