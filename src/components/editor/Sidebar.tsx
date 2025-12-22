import React, { useEffect } from 'react';
import { useAgentStore } from '@/store/useAgentStore';
import { getNodeTypes } from '@/api/config';
import { Card, Tooltip } from 'antd'; // Unused but let's just remove Card and Tooltip usage if any
// Actually I removed usage in previous step.
// Let's remove the line.
import { } from 'antd'; // Empty import? No, let's remove it if empty.
// I'll check if I use anything else from antd.
// I don't see any other antd components used in Sidebar.
import { CodeSandboxOutlined, RobotOutlined, ApiOutlined, GatewayOutlined, FileTextOutlined } from '@ant-design/icons';

const Sidebar: React.FC = () => {
    const { nodeTypes, setNodeTypes } = useAgentStore();

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const types = await getNodeTypes();
                // Ensure types is an array (handle AxiosResponse wrapper if needed)
                const typesArray = (Array.isArray(types) ? types : (types as any)?.data || []) as any[];
                setNodeTypes(typesArray);
            } catch (error) {
                console.error('Failed to load node types', error);
            }
        };
        fetchTypes();
    }, [setNodeTypes]);

    const onDragStart = (event: React.DragEvent, nodeType: string, nodeData: any) => {
        event.dataTransfer.setData('application/reactflow/type', 'custom');
        event.dataTransfer.setData('application/reactflow/label', nodeData.nodeName);
        event.dataTransfer.setData('application/reactflow/data', JSON.stringify(nodeData));
        event.dataTransfer.effectAllowed = 'move';
    };

    const getIcon = (iconName: string) => {
        if (iconName?.includes('LLM')) return <RobotOutlined className="text-purple-500" />;
        if (iconName?.includes('CODE')) return <CodeSandboxOutlined className="text-blue-500" />;
        if (iconName?.includes('API')) return <ApiOutlined className="text-green-500" />;
        if (iconName?.includes('ROUTER')) return <GatewayOutlined className="text-orange-500" />;
        return <FileTextOutlined className="text-gray-500" />;
    };

    // Helper to request types locally since we replaced import
    // Actually we should import getNodeTypes from api/config
    // But since I cannot change imports easily in replace_file_content without context...
    // Wait, imports are at top of file. I should replace entire file or ensure imports are correct.
    // The previous code verified imports: import { getNodeTypes } from '@/api/config';
    // I will reuse that import.

    return (
        <div className="w-full h-40 bg-white border-t border-gray-200 flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                <span className="font-bold text-gray-700 text-sm">节点组件库</span>
                <span className="text-xs text-gray-400">拖拽节点到画布</span>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex gap-4 items-center">
                {nodeTypes.map((node) => (
                    <div
                        key={node.nodeType}
                        draggable
                        onDragStart={(event) => onDragStart(event, 'custom', node)}
                        className="flex-shrink-0 cursor-move"
                    >
                        <div className="w-48 h-24 bg-white border border-gray-200 rounded-lg p-3 flex flex-col justify-between hover:shadow-lg hover:border-blue-400 transition-all duration-200 group relative overflow-hidden">
                            {/* Decorative background circle */}
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-gray-50 rounded-full group-hover:bg-blue-50 transition-colors" />

                            <div className="flex items-center gap-2 z-10">
                                <div className="p-1.5 bg-gray-50 rounded-md group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <div className="text-lg">{getIcon(node.icon)}</div>
                                </div>
                                <div className="font-bold text-gray-700 truncate">{node.nodeName}</div>
                            </div>

                            <div className="text-xs text-gray-400 line-clamp-2 z-10">
                                {node.description || '暂无描述'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
