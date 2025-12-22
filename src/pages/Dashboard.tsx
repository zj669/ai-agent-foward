import React, { useEffect, useState } from 'react';
import { Input, Button, Spin, Empty, Modal, message, Tooltip, Statistic } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    CloudUploadOutlined,
    PlayCircleOutlined,
    EditOutlined,
    DeleteOutlined,
    RocketOutlined,
    RobotOutlined,
    ThunderboltOutlined,
    CheckCircleOutlined,
    FileTextOutlined,
    ArrowRightOutlined,
    SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAgentList, publishAgent } from '@/api/agent';
import { AiAgent } from '@/types';
import '../styles/dashboard.css';

// Utility for consistent avatar colors
const getAvatarColor = (name: string) => {
    const gradients = [
        'from-blue-400 to-indigo-500',
        'from-purple-400 to-pink-500',
        'from-emerald-400 to-teal-500',
        'from-orange-400 to-red-500',
        'from-cyan-400 to-blue-500',
        'from-rose-400 to-orange-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
};

// Get greeting based on time of day
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
};

// Skeleton Card Component
const SkeletonCard: React.FC = () => (
    <div className="skeleton-card animate-fade-in-up">
        <div className="skeleton h-1.5 w-full mb-6" />
        <div className="flex justify-between items-start mb-5">
            <div className="skeleton w-14 h-14 rounded-2xl" />
            <div className="skeleton w-16 h-6 rounded-full" />
        </div>
        <div className="skeleton h-6 w-3/4 mb-3" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-2/3" />
        <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="skeleton h-4 w-24" />
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [agents, setAgents] = useState<AiAgent[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        loadAgents();
    }, []);

    const loadAgents = async () => {
        setLoading(true);
        try {
            const data = await getAgentList();
            if (Array.isArray(data)) {
                setAgents(data);
            } else {
                setAgents([]);
            }
        } catch (error) {
            console.error(error);
            message.error('加载Agent列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => navigate('/agent/editor');
    const handleEdit = (agentId: string) => navigate(`/agent/editor/${agentId}`);
    const handleChat = (agentId: string) => navigate(`/agent/chat/${agentId}`);

    const handlePublish = async (agentId: string, agentName: string) => {
        Modal.confirm({
            title: '确认发布',
            icon: <RocketOutlined className="text-blue-600" />,
            content: `确定要发布 Agent "${agentName}" 吗？`,
            okText: '确认发布',
            okButtonProps: { className: 'bg-gradient-to-r from-blue-600 to-indigo-600 border-none' },
            onOk: async () => {
                try {
                    await publishAgent(agentId);
                    message.success('发布成功');
                    loadAgents();
                } catch (error) {
                    message.error('发布失败');
                }
            }
        });
    };

    const filteredAgents = agents.filter(agent => {
        const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
        const matchesSearch = agent.agentName.toLowerCase().includes(searchText.toLowerCase()) ||
            (agent.description || '').toLowerCase().includes(searchText.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const stats = {
        total: agents.length,
        published: agents.filter(a => a.status === 1).length,
        draft: agents.filter(a => a.status === 0).length
    };

    const StatusBadge = ({ status }: { status: number }) => {
        const config = {
            0: { label: '草稿', bg: 'bg-orange-100/80', text: 'text-orange-700', dot: 'bg-orange-500' },
            1: { label: '已发布', bg: 'bg-emerald-100/80', text: 'text-emerald-700', dot: 'bg-emerald-500' },
            2: { label: '已停用', bg: 'bg-red-100/80', text: 'text-red-700', dot: 'bg-red-500' },
        }[status] || { label: '未知', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };

        return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm shadow-sm ${config.bg} ${config.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
                {config.label}
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 relative">
            {/* Mesh Gradient Background */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-200/40 blur-[100px] animate-pulse" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200/40 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-pink-200/30 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Fixed Navbar */}
            <div className="flex-shrink-0 z-20 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex justify-between items-center py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20 animate-float">
                            <RobotOutlined className="text-xl" />
                        </div>
                        <div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 block leading-tight">
                                AI Workbench
                            </span>
                            <span className="text-xs text-gray-500 font-medium tracking-wide">ENTERPRISE EDITION</span>
                        </div>
                    </div>
                    {/* User Actions */}
                    <div className="flex items-center gap-3">
                        <Tooltip title="设置">
                            <Button type="text" shape="circle" icon={<SettingOutlined />} className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50" />
                        </Tooltip>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md cursor-pointer hover:scale-105 transition-transform">
                            U
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                    {/* Welcome Banner */}
                    <div className="welcome-banner rounded-3xl p-8 mb-8 text-white shadow-2xl animate-fade-in-up">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                    {getGreeting()}! 👋
                                </h1>
                                <p className="text-white/80 text-lg">
                                    欢迎回来，今天想创建什么样的智能体？
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    size="large"
                                    icon={<PlusOutlined />}
                                    onClick={handleCreate}
                                    className="bg-white text-indigo-600 border-none hover:bg-white/90 shadow-lg h-12 px-6 rounded-xl font-semibold"
                                >
                                    快速创建
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Hero Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="stat-card bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 transform hover:-translate-y-1 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-blue-100 font-medium mb-1">总智能体</p>
                                    <h3 className="text-4xl font-bold">{stats.total}</h3>
                                </div>
                                <div className="stat-card-icon bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                    <ThunderboltOutlined className="text-2xl" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                <span className="text-sm text-blue-100">活跃运行中</span>
                            </div>
                        </div>

                        <div className="stat-card bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-gray-500 font-medium">已发布</div>
                                <div className="stat-card-icon bg-emerald-50 p-2.5 rounded-xl">
                                    <CheckCircleOutlined className="text-emerald-500 text-xl" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.published}</h3>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${stats.total ? (stats.published / stats.total) * 100 : 0}%` }} />
                            </div>
                        </div>

                        <div className="stat-card bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-gray-500 font-medium">草稿箱</div>
                                <div className="stat-card-icon bg-orange-50 p-2.5 rounded-xl">
                                    <FileTextOutlined className="text-orange-500 text-xl" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.draft}</h3>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-500" style={{ width: `${stats.total ? (stats.draft / stats.total) * 100 : 0}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                        <div className="bg-white/70 backdrop-blur-md p-1.5 rounded-xl border border-white/50 shadow-sm flex gap-1">
                            {[
                                { label: '全部', value: 'all', count: stats.total },
                                { label: '草稿', value: 0, count: stats.draft },
                                { label: '已发布', value: 1, count: stats.published },
                                { label: '已停用', value: 2, count: agents.filter(a => a.status === 2).length },
                            ].map((item) => (
                                <button
                                    key={item.label}
                                    onClick={() => setFilterStatus(item.value as any)}
                                    className={`filter-tab px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${filterStatus === item.value
                                        ? 'active bg-white text-gray-900 shadow-md'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                        }`}
                                >
                                    {item.label}
                                    {item.count > 0 && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterStatus === item.value ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {item.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4 w-full md:w-auto">
                            <Input
                                placeholder="搜索智能体..."
                                prefix={<SearchOutlined className="text-gray-400" />}
                                className="flex-1 md:w-64 rounded-xl border-gray-200/50 bg-white/70 backdrop-blur-sm focus:bg-white transition-all h-11"
                                allowClear
                                onChange={e => setSearchText(e.target.value)}
                                variant="filled"
                            />
                            <Button
                                type="primary"
                                size="large"
                                icon={<PlusOutlined />}
                                onClick={handleCreate}
                                className="bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 border-none shadow-lg shadow-gray-400/30 h-11 px-6 rounded-xl font-semibold"
                            >
                                新建
                            </Button>
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>
                    ) : filteredAgents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredAgents.map((agent, index) => (
                                <div
                                    key={agent.agentId}
                                    className={`agent-card group relative bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg flex flex-col overflow-hidden animate-fade-in-up card-stagger-${Math.min(index + 1, 8)}`}
                                >
                                    {/* Gradient Top Border */}
                                    <div className={`agent-card-gradient-bar h-1.5 w-full bg-gradient-to-r ${getAvatarColor(agent.agentName)}`} />

                                    <div className="p-6 flex-1 cursor-pointer" onClick={() => handleEdit(agent.agentId)}>
                                        <div className="flex justify-between items-start mb-5">
                                            <div className={`agent-card-avatar w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(agent.agentName)} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                                                {agent.agentName[0]?.toUpperCase()}
                                            </div>
                                            <StatusBadge status={agent.status} />
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                                            {agent.agentName}
                                        </h3>

                                        <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed min-h-[60px]">
                                            {agent.description || '暂无描述信息...'}
                                        </p>
                                    </div>

                                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs font-medium text-gray-400 bg-gray-100/80 px-2 py-1 rounded-md">
                                            {new Date(agent.updateTime).toLocaleDateString()}
                                        </span>

                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                                            {agent.status === 0 && (
                                                <Tooltip title="发布">
                                                    <Button type="text" shape="circle" icon={<CloudUploadOutlined />} className="text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); handlePublish(agent.agentId, agent.agentName); }} />
                                                </Tooltip>
                                            )}
                                            {agent.status === 1 && (
                                                <Tooltip title="对话">
                                                    <Button type="text" shape="circle" icon={<PlayCircleOutlined />} className="text-emerald-600 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); handleChat(agent.agentId); }} />
                                                </Tooltip>
                                            )}
                                            <Tooltip title="编辑">
                                                <Button type="text" shape="circle" icon={<EditOutlined />} className="text-gray-600 hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); handleEdit(agent.agentId); }} />
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* New Card Action */}
                            <div
                                onClick={handleCreate}
                                className="create-card bg-white/40 backdrop-blur-sm border-2 border-dashed border-indigo-200/50 rounded-2xl flex flex-col justify-center items-center text-indigo-400 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 min-h-[280px] group animate-fade-in-up"
                                style={{ animationDelay: `${Math.min(filteredAgents.length + 1, 9) * 50}ms` }}
                            >
                                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
                                    <PlusOutlined className="text-3xl text-indigo-500" />
                                </div>
                                <span className="font-semibold text-lg text-indigo-600/80">创建新智能体</span>
                                <span className="text-sm text-indigo-400/60 mt-1 flex items-center gap-1">
                                    开始您的 AI 之旅 <ArrowRightOutlined className="text-xs" />
                                </span>
                            </div>
                        </div>
                    ) : (
                        <Empty
                            image={
                                <div className="flex justify-center mb-4">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center animate-float">
                                        <RobotOutlined className="text-5xl text-indigo-400" />
                                    </div>
                                </div>
                            }
                            description={
                                <div className="text-center">
                                    <p className="text-gray-600 text-lg mb-1">还没有智能体</p>
                                    <p className="text-gray-400">创建您的第一个 AI 助手，开始探索无限可能</p>
                                </div>
                            }
                            className="py-20 bg-white/60 backdrop-blur-md rounded-3xl shadow-lg border border-white/50 animate-fade-in-up"
                        >
                            <Button
                                type="primary"
                                size="large"
                                onClick={handleCreate}
                                icon={<PlusOutlined />}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 border-none shadow-lg shadow-indigo-500/30 h-12 px-8 rounded-xl font-semibold"
                            >
                                立即创建
                            </Button>
                        </Empty>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
