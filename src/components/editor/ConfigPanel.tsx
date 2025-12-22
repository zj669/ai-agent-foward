import React, { useEffect, useState } from 'react';
import { useAgentStore } from '@/store/useAgentStore';
import { getConfigDefinitions, getConfigFieldDefinitions } from '@/api/config';
import { Form, Input, Select, InputNumber, Checkbox, Switch, Button, Spin, Empty, Divider, message, Radio, Tooltip, Modal } from 'antd';
import { InfoCircleOutlined, DeleteOutlined } from '@ant-design/icons';

// Type definitions for config fields
interface FieldDef {
    fieldName: string;
    fieldLabel: string;
    fieldType: string; // text, number, select, textarea, boolean, password
    required: boolean;
    defaultValue?: any;
    options?: string[]; // for select
    description?: string;
}

interface ConfigDef {
    configType: string;
    configName: string;
    description: string;
    options?: { id: string; name: string; type: string }[];
}

const renderField = (field: FieldDef) => {
    switch (field.fieldType) {
        case 'select':
            return (
                <Select placeholder="请选择">
                    {field.options?.map(opt => <Select.Option key={opt} value={opt}>{opt}</Select.Option>)}
                </Select>
            );
        case 'number':
            return <InputNumber className="w-full" />;
        case 'checkbox':
        case 'boolean':
            return <Switch />;
        case 'textarea':
            return <Input.TextArea rows={4} />;
        case 'password':
            return <Input.Password />;
        default:
            return <Input />;
    }
};

interface ModelConfigProps {
    configDef: ConfigDef;
    fieldDefs: FieldDef[];
}

const ModelConfig: React.FC<ModelConfigProps> = ({ configDef, fieldDefs }) => {
    const form = Form.useFormInstance();
    const modelId = Form.useWatch(['MODEL', 'modelId'], form);

    // Determine if custom mode is active (modelId is null/undefined or explicitly 'custom' logic if we added it)
    // Our logic: if modelId is selected, it's platform mode. If we want custom, we clear modelId.
    const [mode, setMode] = useState<'platform' | 'custom'>(!modelId ? 'custom' : 'platform');

    // Update mode when modelId changes externally (e.g. initial load)
    useEffect(() => {
        if (modelId) {
            setMode('platform');
        } else if (mode === 'platform' && !modelId) {
            // If we are in platform mode but modelId is empty, stay in platform waiting for selection
            // unless we specifically switched to custom. 
        }
    }, [modelId]);

    const handleModeChange = (e: any) => {
        const newMode = e.target.value;
        setMode(newMode);
        if (newMode === 'custom') {
            form.setFieldValue(['MODEL', 'modelId'], null);
        } else {
            // When switching back to platform, maybe select the first available model? 
            // Or just clear custom fields? Let's keep it simple.
        }
    };

    // Filter fields based on mode
    const customFields = ['baseUrl', 'apiKey', 'modelName'];
    const commonFields = fieldDefs.filter(f => !customFields.includes(f.fieldName));

    return (
        <div className="mb-4">
            <Form.Item label="模型来源">
                <Radio.Group value={mode} onChange={handleModeChange} optionType="button" buttonStyle="solid">
                    <Radio.Button value="platform">系统预置</Radio.Button>
                    <Radio.Button value="custom">自定义</Radio.Button>
                </Radio.Group>
            </Form.Item>

            {mode === 'platform' && (
                <Form.Item
                    name={['MODEL', 'modelId']}
                    label="选择模型"
                    rules={[{ required: true, message: '请选择模型' }]}
                >
                    <Select placeholder="请选择模型">
                        {configDef.options?.map(opt => (
                            <Select.Option key={opt.id} value={opt.id}>
                                {opt.name} <span className="text-gray-400 text-xs">({opt.type})</span>
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
            )}

            {mode === 'custom' && (
                <div className="bg-gray-50 p-3 rounded mb-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">请输入自定义模型的连接信息</p>
                    {fieldDefs.filter(f => customFields.includes(f.fieldName)).map(field => (
                        <Form.Item
                            key={field.fieldName}
                            name={['MODEL', field.fieldName]}
                            label={field.fieldLabel}
                            rules={[{ required: field.required, message: '此项必填' }]}
                            tooltip={field.description}
                        >
                            {renderField(field)}
                        </Form.Item>
                    ))}
                </div>
            )}

            <Divider dashed style={{ margin: '12px 0' }} />
            <div className="px-1">
                <div className="text-xs font-bold text-gray-500 mb-3">参数配置</div>
                {commonFields.map(field => (
                    <Form.Item
                        key={field.fieldName}
                        name={['MODEL', field.fieldName]}
                        label={
                            <span>
                                {field.fieldLabel}
                                {field.description && (
                                    <Tooltip title={field.description}>
                                        <InfoCircleOutlined className="ml-1 text-gray-400" />
                                    </Tooltip>
                                )}
                            </span>
                        }
                        valuePropName={field.fieldType === 'boolean' || field.fieldType === 'checkbox' ? 'checked' : 'value'}
                    >
                        {renderField(field)}
                    </Form.Item>
                ))}
            </div>
        </div>
    );
};


// Helper to determine ID field name based on config type
const getIdFieldName = (configType: string): string => {
    switch (configType) {
        case 'MODEL': return 'modelId';
        case 'ADVISOR': return 'advisorId';
        case 'MCP_TOOL': return 'mcpId';
        case 'SYSTEM_PROMPT': return 'promptId';
        default: return configType.toLowerCase() + 'Id';
    }
};

// Global cache to store config definitions
const configCache: {
    defs: Record<string, ConfigDef>;
    fields: Record<string, FieldDef[]>;
} = {
    defs: {},
    fields: {}
};

interface ConfigPanelProps {
    onClose?: () => void;
    onHeaderMouseDown?: (e: React.MouseEvent) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onClose, onHeaderMouseDown }) => {
    const { nodes, selectedNodeId, updateNodeData, deleteNode } = useAgentStore();
    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    const [loading, setLoading] = useState(false);
    const [fieldDefsMap, setFieldDefsMap] = useState<Record<string, FieldDef[]>>({});
    const [configDefsMap, setConfigDefsMap] = useState<Record<string, ConfigDef>>({});
    const [form] = Form.useForm();

    // Load configs when selected node changes
    useEffect(() => {
        if (!selectedNode) return;

        let active = true;

        const load = async () => {
            // Try to get supportedConfigs from data (passed from Sidebar -> FlowCanvas -> Node)
            let supportedConfigs = (selectedNode.data?.supportedConfigs as string[]) || [];

            if (!supportedConfigs.length) {
                setFieldDefsMap({});
                setConfigDefsMap({});
                form.resetFields(); // Ensure form is clear
                return;
            }

            // Check if we have all needed configs in cache
            const missingConfigs = supportedConfigs.filter(
                type => !configCache.defs[type] || !configCache.fields[type]
            );

            if (missingConfigs.length > 0) {
                setLoading(true);
                try {
                    await Promise.all(missingConfigs.map(async (configType) => {
                        // Fetch definitions if missing
                        const [configDefArray, fields] = await Promise.all([
                            getConfigDefinitions(configType).catch(() => []),
                            getConfigFieldDefinitions(configType).catch(() => [])
                        ]);

                        // Update cache
                        if (configDefArray && configDefArray.length > 0) {
                            configCache.defs[configType] = configDefArray[0];
                        }
                        if (fields) {
                            configCache.fields[configType] = fields;
                        }
                    }));
                } catch (e) {
                    console.error(e);
                    message.error('加载配置失败');
                } finally {
                    if (active) setLoading(false);
                }
            }

            if (!active) return;

            // Build maps from cache
            const fieldsMap: Record<string, FieldDef[]> = {};
            const configsMap: Record<string, ConfigDef> = {};

            for (const configType of supportedConfigs) {
                if (configCache.defs[configType]) configsMap[configType] = configCache.defs[configType];
                if (configCache.fields[configType]) fieldsMap[configType] = configCache.fields[configType];
            }

            setConfigDefsMap(configsMap);
            setFieldDefsMap(fieldsMap);

            // Set form values
            // Use data.config which is already structured by graphConverter.ts as { MODEL: {...}, USER_PROMPT: {...} }
            const currentConfig = (selectedNode.data?.config as any) || {};

            // Reset fields before setting new values to ensure independence
            form.resetFields();
            form.setFieldsValue(currentConfig);
        };

        load();

        return () => {
            active = false;
        };
    }, [selectedNode?.id, selectedNode?.data?.supportedConfigs]); // Add supportedConfigs to dependency

    const handleValuesChange = (changedValues: any, allValues: any) => {
        if (selectedNodeId) {
            // allValues is already nested object { MODEL: { ... }, ... } due to form binding
            updateNodeData(selectedNodeId, { config: allValues });
        }
    };

    if (!selectedNode) {
        return (
            <div className="h-full flex flex-col bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
                <div
                    className="flex justify-end p-2 bg-gray-50 border-b border-gray-100 cursor-move"
                    onMouseDown={onHeaderMouseDown}
                >
                    {onClose && (
                        <Button
                            type="text"
                            icon={<span className="text-gray-400 text-lg">×</span>}
                            onClick={onClose}
                            size="small"
                        />
                    )}
                </div>
                <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
                    <div className="text-center">
                        <div className="mb-2">请选择一个节点</div>
                        <div className="text-xs text-gray-300">点击画布上的节点进行配置</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
            <div
                className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 cursor-move transition-colors hover:bg-gray-100"
                onMouseDown={onHeaderMouseDown}
            >
                <div className="flex items-center gap-2">
                    {onClose && (
                        <Button
                            type="text"
                            icon={<span className="text-gray-400">⇤</span>}
                            onClick={onClose}
                            className="mr-1"
                            size="small"
                            title="隐藏面板"
                        />
                    )}
                    <div>
                        <div className="font-bold text-gray-800">{(selectedNode.data?.label as React.ReactNode) || '未命名节点'}</div>
                        <div className="text-xs text-gray-400 font-mono mt-1">{selectedNode.id}</div>
                    </div>
                </div>
                <div className="tag px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs font-semibold">
                    {(selectedNode.data?.nodeType as string) || (selectedNode.type as string)}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50/50">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Spin tip="加载配置中..." />
                    </div>
                ) : Object.keys(fieldDefsMap).length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无配置项" />
                ) : (
                    <Form
                        form={form}
                        layout="vertical"
                        onValuesChange={handleValuesChange}
                        className="py-2"
                    >
                        {Object.keys(fieldDefsMap).map(configType => {
                            const configDef = configDefsMap[configType];
                            const fieldDefs = fieldDefsMap[configType] || [];
                            const hasOptions = configDef?.options && configDef.options.length > 0;

                            return (
                                <div key={configType} className="mb-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-50">
                                        <div className="w-1 h-4 bg-blue-500 rounded-full shadow-sm shadow-blue-200" />
                                        <span className="font-bold text-gray-700 text-sm">{configDef?.configName || configType}</span>
                                    </div>

                                    {configDef?.description && (
                                        <p className="text-xs text-gray-400 mb-4 px-1">{configDef.description}</p>
                                    )}

                                    {configType === 'MODEL' ? (
                                        <ModelConfig
                                            configDef={configDef!}
                                            fieldDefs={fieldDefs}
                                        />
                                    ) : hasOptions ? (
                                        // Case: Options exist (e.g. ADVISOR, MCP_TOOL selection)
                                        // Render a Select for the ID
                                        <Form.Item
                                            key={`${configType}-selection`}
                                            name={[configType, getIdFieldName(configType)]}
                                            label={`选择${configDef?.configName || configType}`}
                                            rules={[{ required: !['MCP_TOOL', 'ADVISOR'].includes(configType), message: '请选择' }]}
                                        >
                                            <Select
                                                placeholder={['MCP_TOOL', 'ADVISOR'].includes(configType) ? "请选择 (可选)" : "请选择"}
                                                allowClear={['MCP_TOOL', 'ADVISOR'].includes(configType)}
                                            >
                                                {configDef!.options!.map(opt => (
                                                    <Select.Option key={opt.id} value={opt.id}>
                                                        {opt.name} {opt.type ? <span className="text-gray-400 text-xs">({opt.type})</span> : ''}
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    ) : (
                                        // Case: No options, render dynamic fields (e.g. TIMEOUT, USER_PROMPT)
                                        fieldDefs.map(field => (
                                            <Form.Item
                                                key={field.fieldName}
                                                name={[configType, field.fieldName]} // Nested binding
                                                label={field.fieldLabel}
                                                rules={[{ required: field.required, message: '此项必填' }]}
                                                tooltip={field.description}
                                                valuePropName={field.fieldType === 'boolean' || field.fieldType === 'checkbox' ? 'checked' : 'value'}
                                            >
                                                {renderField(field)}
                                            </Form.Item>
                                        ))
                                    )}
                                </div>
                            );
                        })}
                    </Form>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                        Modal.confirm({
                            title: '确认删除',
                            content: '确定要删除该节点吗？',
                            okText: '删除',
                            okType: 'danger',
                            cancelText: '取消',
                            onOk: () => {
                                if (selectedNodeId) {
                                    deleteNode(selectedNodeId);
                                    if (onClose) onClose();
                                }
                            }
                        });
                    }}
                >
                    删除节点
                </Button>
            </div>
        </div>
    );
};

export default ConfigPanel;
