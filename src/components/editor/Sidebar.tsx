import React, { useEffect } from 'react';
import { useAgentStore } from '@/store/useAgentStore';
import { getNodeTypes } from '@/api/config';
import {
    CodeSandboxOutlined,
    RobotOutlined,
    ApiOutlined,
    GatewayOutlined,
    FileTextOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import llmIcon from '@/assets/icons/llm.svg';
import codeIcon from '@/assets/icons/code.svg';
import apiIcon from '@/assets/icons/api.svg';
import routerIcon from '@/assets/icons/router.svg';
import humanIcon from '@/assets/icons/human.svg';
import planIcon from '@/assets/icons/plan.svg';
import reactIcon from '@/assets/icons/react.svg';
import actIcon from '@/assets/icons/act.svg';

const Sidebar: React.FC = () => {
    const { nodeTypes, setNodeTypes } = useAgentStore();

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const types = await getNodeTypes();
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
        if (!iconName) return <img src={codeIcon} alt="Default" className="w-8 h-8 grayscale opacity-50" />;
        const name = iconName.toLowerCase();
        if (name.includes('llm')) return <img src={llmIcon} alt="LLM" className="w-8 h-8" />;
        if (name.includes('code')) return <img src={codeIcon} alt="CODE" className="w-8 h-8" />;
        if (name.includes('api')) return <img src={apiIcon} alt="API" className="w-8 h-8" />;
        if (name.includes('router')) return <img src={routerIcon} alt="ROUTER" className="w-8 h-8" />;

        // New types
        if (name.includes('act')) return <img src={actIcon} alt="ACT" className="w-8 h-8" />;
        if (name.includes('human')) return <img src={humanIcon} alt="HUMAN" className="w-8 h-8" />;
        if (name.includes('plan')) return <img src={planIcon} alt="PLAN" className="w-8 h-8" />;
        if (name.includes('react')) return <img src={reactIcon} alt="REACT" className="w-8 h-8" />;

        return <img src={codeIcon} alt="Default" className="w-8 h-8 grayscale opacity-50" />;
    };

    const getGradient = (iconName: string) => {
        const name = (iconName || '').toLowerCase();
        if (name.includes('llm')) return 'bg-gradient-to-br from-purple-500 to-indigo-600';
        if (name.includes('code')) return 'bg-gradient-to-br from-blue-500 to-cyan-500';
        if (name.includes('api')) return 'bg-gradient-to-br from-emerald-500 to-teal-500';
        if (name.includes('router')) return 'bg-gradient-to-br from-orange-500 to-red-500';

        if (name.includes('act')) return 'bg-gradient-to-br from-green-500 to-emerald-600';
        if (name.includes('human')) return 'bg-gradient-to-br from-pink-500 to-rose-500';
        if (name.includes('plan')) return 'bg-gradient-to-br from-blue-600 to-indigo-600';
        if (name.includes('react')) return 'bg-gradient-to-br from-violet-500 to-purple-600';

        return 'bg-gradient-to-br from-gray-500 to-gray-600';
    };

    return (
        <div className="w-full h-44 bg-white/80 backdrop-blur-xl border-t border-white/50 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-20 relative">
            {/* Soft decorative blob */}
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-100/30 blur-[80px] rounded-full pointer-events-none" />

            <div className="px-6 py-2 border-b border-gray-100/50 flex justify-between items-center bg-white/40">
                <div className="flex items-center gap-2">
                    <AppstoreOutlined className="text-blue-600" />
                    <span className="font-bold text-gray-700">组件库</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">拖拽上屏</span>
                </div>
                <span className="text-xs text-gray-400">Total: {nodeTypes.length}</span>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex gap-5 items-center scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {nodeTypes.map((node) => (
                    <div
                        key={node.nodeType}
                        draggable
                        onDragStart={(event) => onDragStart(event, 'custom', node)}
                        className="flex-shrink-0 cursor-move group"
                    >
                        <div className="w-48 h-24 bg-white rounded-xl border border-gray-100 p-3 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group-hover:border-blue-200">
                            {/* Hover Gradient Overlay */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${getGradient(node.icon)} opacity-0 group-hover:opacity-100 transition-opacity`} />

                            <div className="flex items-start gap-3 z-10">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${getGradient(node.icon)} transform group-hover:scale-110 transition-transform duration-300`}>
                                    {getIcon(node.icon)}
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="font-bold text-gray-800 text-sm truncate group-hover:text-blue-600 transition-colors">{node.nodeName}</div>
                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{node.nodeType}</div>
                                </div>
                            </div>

                            <div className="text-xs text-gray-400 line-clamp-1 pl-1">
                                {node.description || '功能组件'}
                            </div>

                            {/* Plus Icon on Hover (Visual Cue) */}
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 font-bold text-xl leading-none">
                                +
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
