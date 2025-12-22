import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Input, Spin, Modal } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, SettingOutlined, ExpandAltOutlined } from '@ant-design/icons';
import Sidebar from '@/components/editor/Sidebar';
import FlowCanvasWrapper from '@/components/editor/FlowCanvas';
import ConfigPanel from '@/components/editor/ConfigPanel';
import { useAgentStore } from '@/store/useAgentStore';
import { getAgentDetail, saveAgent } from '@/api/agent';
import { convertToGraphJsonSchema, convertFromGraphJsonSchema } from '@/utils/graphConverter';

const AgentEditor: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { nodes, edges, setGraph, selectedNodeId } = useAgentStore();

    const [loading, setLoading] = useState(false);
    const [agentName, setAgentName] = useState('My New Agent');
    const [description, setDescription] = useState('');
    const [showConfig, setShowConfig] = useState(true);
    const [showDescModal, setShowDescModal] = useState(false);

    // Auto-show config panel when a node is selected
    useEffect(() => {
        if (selectedNodeId) {
            setShowConfig(true);
        }
    }, [selectedNodeId]);

    // Unified drag state
    const [positions, setPositions] = useState({
        panel: { x: window.innerWidth - 350, y: 80 },
        button: { x: window.innerWidth - 120, y: 20 }
    });

    // Refs for direct DOM manipulation to avoid re-renders during drag
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<any>(null); // Button supports ref forwarding, use any to avoid TS issues

    const dragRef = useRef({
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        target: null as 'panel' | 'button' | null
    });

    const handleDragStart = (e: React.MouseEvent, target: 'panel' | 'button') => {
        e.preventDefault(); // Prevent text selection
        e.stopPropagation(); // Stop propagation

        const currentPos = positions[target];
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: currentPos.x,
            initialY: currentPos.y,
            target
        };
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    };

    const handleDragMove = (e: MouseEvent) => {
        if (!dragRef.current.target) return;

        requestAnimationFrame(() => {
            const { startX, startY, initialX, initialY, target } = dragRef.current;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const newX = initialX + dx;
            const newY = initialY + dy;

            // Simple boundary constraints
            const maxX = window.innerWidth - (target === 'panel' ? 320 : 120);
            const maxY = window.innerHeight - (target === 'panel' ? 40 : 40);

            const clampedX = Math.max(0, Math.min(newX, maxX));
            const clampedY = Math.max(0, Math.min(newY, maxY));

            // Direct DOM update
            const el = target === 'panel' ? panelRef.current : buttonRef.current;
            if (el) {
                // Button ref from Antd might be a component wrapper, need findDOMNode or use native element if forwarded
                // If it's a reacting component, check if we can style it.
                // Antd button forwards ref to button element usually.
                el.style.left = `${clampedX}px`;
                el.style.top = `${clampedY}px`;
            }
        });
    };

    const handleDragEnd = (e: MouseEvent) => {
        const { target, startX, startY, initialX, initialY } = dragRef.current;

        if (target) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newX = initialX + dx;
            const newY = initialY + dy;

            const maxX = window.innerWidth - (target === 'panel' ? 320 : 120);
            const maxY = window.innerHeight - (target === 'panel' ? 40 : 40);

            setPositions(prev => ({
                ...prev,
                [target]: {
                    x: Math.max(0, Math.min(newX, maxX)),
                    y: Math.max(0, Math.min(newY, maxY))
                }
            }));
        }

        dragRef.current.target = null;
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
    };

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
            // Fetch agent detail and node types in parallel to enrich graph data
            const [agent, nodeTypes] = await Promise.all([
                getAgentDetail(agentId),
                import('@/api/config').then(mod => mod.getNodeTypes().catch(e => {
                    console.error('Failed to load node types', e);
                    return [];
                }))
            ]);

            setAgentName(agent.agentName);
            setDescription(agent.description);

            // Create a lookup map for node types
            // Cast nodeTypes to any[] to handle potential type mismatch with AxiosResponse
            const typesArray = (Array.isArray(nodeTypes) ? nodeTypes : (nodeTypes as any)?.data || []) as any[];
            const nodeTypeMap = new Map(typesArray.map((t: any) => [t.nodeType, t]));

            if (agent.graphJson) {
                try {
                    const schema = JSON.parse(agent.graphJson);
                    const { nodes, edges } = convertFromGraphJsonSchema(schema);

                    // Enrich nodes with metadata
                    const enrichedNodes = nodes.map(node => {
                        // The loaded node.type is the business type (e.g. LLM_NODE) from backend schema
                        const businessType = node.type || 'UNKNOWN';
                        const typeDef = nodeTypeMap.get(businessType) as any;

                        return {
                            ...node,
                            type: 'default', // Force visual type to default to match new nodes
                            data: {
                                ...node.data,
                                nodeType: businessType, // Ensure data.nodeType exists
                                supportedConfigs: typeDef?.supportedConfigs || [], // Restore supportedConfigs
                                // We could also restore icon/description if needed
                            }
                        };
                    });

                    setGraph(enrichedNodes || [], edges || []);
                    // Update global store nodeTypes if needed, though Sidebar checks it self
                    useAgentStore.getState().setNodeTypes(typesArray);

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
            // Convert to backend GraphJsonSchema format
            const graphSchema = convertToGraphJsonSchema(
                nodes,
                edges,
                agentName,
                description
            );
            const graphJson = JSON.stringify(graphSchema);

            // 注意：后端期望的字段名是 agentId (String类型)，不是 id
            await saveAgent({
                agentId: id || undefined,  // 保持为 string 类型
                agentName,
                description,
                graphJson,
                status: 0 // Draft
            });

            message.success('保存成功');
            if (!id) {
                // Navigate to list or stay? 
                // Ideally backend returns ID to navigate to /agent/editor/:id
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
        <div className="flex flex-col h-screen w-full overflow-hidden">
            {/* Header */}
            <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>
                        返回
                    </Button>
                    <Input
                        value={agentName}
                        onChange={e => setAgentName(e.target.value)}
                        className="w-48 font-bold border-transparent hover:border-gray-300 focus:border-blue-500 text-lg !px-2"
                        placeholder="Agent名称"
                    />
                    <div className="h-6 w-px bg-gray-300 mx-2" />
                    <Input
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-96 border-transparent hover:border-gray-300 focus:border-blue-500 text-gray-500 !px-2"
                        placeholder="在此输入Agent描述..."
                    />
                    <Button
                        type="text"
                        icon={<ExpandAltOutlined />}
                        onClick={() => setShowDescModal(true)}
                        className="text-gray-400 hover:text-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={loading}
                        onClick={handleSave}
                    >
                        保存
                    </Button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Center Column: Canvas + Bottom Dock */}
                <div className="flex-1 flex flex-col relative min-w-0">
                    {/* Main Canvas */}
                    <div className="flex-1 bg-gray-50 relative">
                        {loading && id ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-50">
                                <Spin size="large" />
                            </div>
                        ) : (
                            <FlowCanvasWrapper />
                        )}
                        {!showConfig && (
                            <Button
                                ref={buttonRef}
                                icon={<SettingOutlined />}
                                className="fixed z-50 shadow-md cursor-move"
                                style={{
                                    top: positions.button.y,
                                    left: positions.button.x
                                }}
                                onMouseDown={(e) => handleDragStart(e, 'button')}
                                onClick={(e) => {
                                    // Simple check to prevent click if dragged (though simplified here)
                                    setShowConfig(true);
                                }}
                            >
                                配置面板
                            </Button>
                        )}
                    </div>

                    {/* Bottom Node Library */}
                    <Sidebar />
                </div>

                {/* Right Sidebar - Config Panel (Floating) */}
                {showConfig && (
                    <div
                        className="fixed right-4 top-20 w-80 bg-white shadow-2xl z-50 rounded-lg flex flex-col border border-gray-200"
                        style={{
                            height: 'calc(100vh - 200px)', // Adjust height constraint
                            maxHeight: '1000px'
                        }}
                    >
                        <ConfigPanel
                            onClose={() => setShowConfig(false)}
                        />
                    </div>
                )}
            </div>


            <Modal
                title="编辑 Agent 描述"
                open={showDescModal}
                onOk={() => setShowDescModal(false)}
                onCancel={() => setShowDescModal(false)}
                width={600}
            >
                <Input.TextArea
                    rows={6}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="请输入详细的 Agent 描述..."
                />
            </Modal>
        </div >
    );
};

export default AgentEditor;
