import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Input, Spin, Modal, Tooltip } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, ExpandAltOutlined, InfoCircleOutlined, ThunderboltOutlined, SettingOutlined } from '@ant-design/icons';
import Sidebar from '@/components/editor/Sidebar';
import FlowCanvasWrapper from '@/components/editor/FlowCanvas';
import ConfigPanel from '@/components/editor/ConfigPanel';
import { useAgentStore } from '@/store/useAgentStore';
import { getAgentDetail, saveAgent } from '@/api/agent';
import { convertToGraphJsonSchema, convertFromGraphJsonSchema } from '@/utils/graphConverter';

const AgentEditor: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { nodes, edges, setGraph, selectedNodeId, selectedEdgeId } = useAgentStore();

    const [loading, setLoading] = useState(false);
    const [agentName, setAgentName] = useState('My New Agent');
    const [description, setDescription] = useState('');
    const [showConfig, setShowConfig] = useState(true);
    const [showDescModal, setShowDescModal] = useState(false);

    // Auto-show config panel when a node or edge is selected
    useEffect(() => {
        if (selectedNodeId || selectedEdgeId) {
            setShowConfig(true);
        }
    }, [selectedNodeId, selectedEdgeId]);

    // Load agent data if id exists
    useEffect(() => {
        if (id) {
            loadAgentData(id);
        } else {
            // Reset for new agent
            setGraph([], []);
            setAgentName('My New Agent');
            setDescription('');
        }
    }, [id]);

    const loadAgentData = async (agentId: string) => {
        setLoading(true);
        try {
            // Fetch agent detail and node templates in parallel to enrich graph data
            const [agent, nodeTemplates] = await Promise.all([
                getAgentDetail(agentId),
                import('@/api/config').then(mod => mod.getNodeTemplates().catch(e => {
                    console.error('Failed to load node templates', e);
                    return [];
                }))
            ]);

            setAgentName(agent.agentName);
            setDescription(agent.description);

            // Create a lookup map for node templates
            const templatesArray = (Array.isArray(nodeTemplates) ? nodeTemplates : (nodeTemplates as any)?.data || []) as any[];
            const nodeTypeMap = new Map(templatesArray.map((t: any) => [t.nodeType, t]));

            if (agent.graphJson) {
                try {
                    const schema = JSON.parse(agent.graphJson);
                    const { nodes, edges } = convertFromGraphJsonSchema(schema);

                    // Enrich nodes with metadata
                    const enrichedNodes = nodes.map(node => {
                        const businessType = node.type || 'UNKNOWN';
                        const typeDef = nodeTypeMap.get(businessType) as any;

                        const nodeData = { ...node.data };
                        if (nodeData.modelId) {
                            delete nodeData.apiKey;
                            delete nodeData.baseUri;
                        }

                        let supportedConfigs: string[] = [];
                        if (typeDef?.editableFields) {
                            try {
                                const parsed = typeof typeDef.editableFields === 'string'
                                    ? JSON.parse(typeDef.editableFields)
                                    : typeDef.editableFields;
                                supportedConfigs = Array.isArray(parsed) ? parsed : [];
                            } catch (e) {
                                console.warn(`Failed to parse editableFields for ${businessType}:`, e);
                                supportedConfigs = [];
                            }
                        }

                        return {
                            ...node,
                            type: 'custom',
                            data: {
                                ...nodeData,
                                nodeType: businessType,
                                supportedConfigs: supportedConfigs,
                            }
                        };
                    });

                    const enrichedEdges = (edges || []).map(edge => ({
                        ...edge,
                        type: 'custom',
                    }));

                    setGraph(enrichedNodes || [], enrichedEdges);
                    useAgentStore.getState().setNodeTypes(templatesArray);

                } catch (e) {
                    console.error('Failed to parse graphJson', e);
                    message.error('解析Agent数据失败');
                }
            }
        } catch (error) {
            console.error(error);
            message.error('加载Agent失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const graphSchema = convertToGraphJsonSchema(
                nodes,
                edges,
                agentName,
                description
            );
            const graphJson = JSON.stringify(graphSchema);

            await saveAgent({
                agentId: id || undefined,
                agentName,
                description,
                graphJson,
                status: 0 // Draft
            });

            message.success('保存成功');
            if (!id) {
                navigate('/dashboard');
            }
        } catch (error) {
            console.error(error);
            message.error('保存失败: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
            {/* Header */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 shadow-sm relative shrink-0">
                <div className="flex items-center gap-4 flex-1">
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/dashboard')}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        返回
                    </Button>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <ThunderboltOutlined />
                        </div>
                        <Input
                            value={agentName}
                            onChange={e => setAgentName(e.target.value)}
                            className="w-64 font-bold text-lg border-transparent hover:border-slate-300 focus:border-indigo-500 !bg-transparent !shadow-none px-2"
                            placeholder="Agent Name"
                        />
                    </div>
                    {description && (
                        <div className="hidden md:flex items-center gap-2 max-w-md">
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-500 truncate text-sm">{description}</span>
                            <Button
                                type="text"
                                size="small"
                                icon={<ExpandAltOutlined />}
                                onClick={() => setShowDescModal(true)}
                                className="text-slate-400 hover:text-indigo-500"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Tooltip title={showConfig ? "隐藏配置面板" : "显示配置面板"}>
                        <Button
                            icon={<SettingOutlined />}
                            type={showConfig ? 'default' : 'text'}
                            onClick={() => setShowConfig(!showConfig)}
                            className={showConfig ? 'border-indigo-200 text-indigo-600 bg-indigo-50' : 'text-slate-500'}
                        />
                    </Tooltip>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={loading}
                        onClick={handleSave}
                        className="shadow-lg shadow-indigo-200 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 border-none px-6 h-9"
                    >
                        保存 Agent
                    </Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar: Node Library */}
                <Sidebar />

                {/* Center: Canvas */}
                <div className="flex-1 relative bg-slate-50 overflow-hidden">
                    {loading && id ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50">
                            <Spin size="large" />
                            <span className="mt-4 text-slate-500 font-medium">Loading Agent...</span>
                        </div>
                    ) : (
                        <FlowCanvasWrapper />
                    )}

                    {/* Floating Controls Overlay (Zoom etc, if any) */}
                    <div className="absolute bottom-4 left-4 z-10 text-xs text-slate-400 pointer-events-none select-none">
                        Ai Agent Workbench v2.0
                    </div>
                </div>

                {/* Right Sidebar: Configuration */}
                {showConfig && (
                    <div className="w-96 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col transition-all">
                        <ConfigPanel onClose={() => setShowConfig(false)} />
                    </div>
                )}
            </div>

            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <InfoCircleOutlined className="text-indigo-500" />
                        <span>编辑 Agent 描述</span>
                    </div>
                }
                open={showDescModal}
                onOk={() => setShowDescModal(false)}
                onCancel={() => setShowDescModal(false)}
                width={500}
                centered
                okButtonProps={{ className: 'bg-indigo-600' }}
            >
                <div className="pt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
                    <Input.TextArea
                        rows={6}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="请输入详细的 Agent 描述..."
                        className="!resize-none text-slate-600"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default AgentEditor;
