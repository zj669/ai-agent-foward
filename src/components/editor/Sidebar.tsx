import React, { useEffect, useState } from 'react';
import { useAgentStore } from '@/store/useAgentStore';
import { getNodeTemplates, NodeTemplate } from '@/api/config';
import {
    AppstoreOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { Input, Empty } from 'antd';
import llmIcon from '@/assets/icons/llm.svg';
import codeIcon from '@/assets/icons/code.svg';
import apiIcon from '@/assets/icons/api.svg';
import routerIcon from '@/assets/icons/router.svg';
import humanIcon from '@/assets/icons/human.svg';
import planIcon from '@/assets/icons/plan.svg';
import reactIcon from '@/assets/icons/react.svg';
import actIcon from '@/assets/icons/act.svg';

const Sidebar: React.FC = () => {
    const { setNodeTypes } = useAgentStore();
    const [templates, setTemplates] = useState<NodeTemplate[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const result = await getNodeTemplates();
                const templateList = (Array.isArray(result) ? result : (result as any)?.data || []) as NodeTemplate[];
                setTemplates(templateList);
                setNodeTypes(templateList);
            } catch (error) {
                console.error('Failed to load node templates', error);
            }
        };
        fetchTypes();
    }, [setNodeTypes]);

    const onDragStart = (event: React.DragEvent, template: NodeTemplate) => {
        event.dataTransfer.setData('application/reactflow/type', 'custom');
        event.dataTransfer.setData('application/reactflow/label', template.templateLabel);
        event.dataTransfer.setData('application/reactflow/data', JSON.stringify(template));
        event.dataTransfer.effectAllowed = 'move';
    };

    const getIcon = (iconName: string) => {
        if (!iconName) return <img src={codeIcon} alt="Default" className="w-5 h-5 grayscale opacity-50" />;
        const name = iconName.toLowerCase();
        if (name.includes('llm')) return <img src={llmIcon} alt="LLM" className="w-5 h-5" />;
        if (name.includes('code')) return <img src={codeIcon} alt="CODE" className="w-5 h-5" />;
        if (name.includes('api')) return <img src={apiIcon} alt="API" className="w-5 h-5" />;
        if (name.includes('router')) return <img src={routerIcon} alt="ROUTER" className="w-5 h-5" />;
        if (name.includes('act')) return <img src={actIcon} alt="ACT" className="w-5 h-5" />;
        if (name.includes('human')) return <img src={humanIcon} alt="HUMAN" className="w-5 h-5" />;
        if (name.includes('plan')) return <img src={planIcon} alt="PLAN" className="w-5 h-5" />;
        if (name.includes('react')) return <img src={reactIcon} alt="REACT" className="w-5 h-5" />;
        return <img src={codeIcon} alt="Default" className="w-5 h-5 grayscale opacity-50" />;
    };

    const getGradient = (iconName: string) => {
        const name = (iconName || '').toLowerCase();
        if (name.includes('llm')) return 'from-purple-500 to-indigo-600';
        if (name.includes('code')) return 'from-blue-500 to-cyan-500';
        if (name.includes('api')) return 'from-emerald-500 to-teal-500';
        if (name.includes('router')) return 'from-orange-500 to-red-500';
        if (name.includes('act')) return 'from-green-500 to-emerald-600';
        if (name.includes('human')) return 'from-pink-500 to-rose-500';
        if (name.includes('plan')) return 'from-blue-600 to-indigo-600';
        if (name.includes('react')) return 'from-violet-500 to-purple-600';
        return 'from-slate-500 to-slate-600';
    };

    const filteredTemplates = templates.filter(t =>
        t.templateLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.nodeType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 shrink-0 shadow-lg z-20">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                        <AppstoreOutlined />
                    </div>
                    <span className="font-bold text-slate-700 text-lg">组件库</span>
                </div>
                <Input
                    prefix={<SearchOutlined className="text-slate-400" />}
                    placeholder="搜索组件..."
                    className="rounded-lg border-slate-200 bg-white focus:bg-white transition-all text-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {filteredTemplates.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到组件" className="mt-10" />
                ) : (
                    filteredTemplates.map((template) => (
                        <div
                            key={template.templateId}
                            draggable
                            onDragStart={(event) => onDragStart(event, template)}
                            className="group cursor-move relative bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getGradient(template.icon)} flex items-center justify-center shadow-sm text-white shrink-0 group-hover:scale-105 transition-transform`}>
                                    {getIcon(template.icon)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-700 text-sm truncate group-hover:text-indigo-600 transition-colors">
                                        {template.templateLabel}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                        {template.nodeType}
                                    </div>
                                </div>
                            </div>
                            {/* Decorative dot */}
                            <div className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-gradient-to-br ${getGradient(template.icon)} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-400">
                拖拽组件至画布以添加
            </div>
        </div>
    );
};

export default Sidebar;
