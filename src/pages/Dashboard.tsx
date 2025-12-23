import React, { useEffect, useState, useRef } from 'react';
import { Input, Button, Spin, Empty, Modal, message, Tooltip, Dropdown, Avatar } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
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
    SettingOutlined,
    ReadOutlined,
    DatabaseOutlined,
    FilePdfOutlined,
    FileMarkdownOutlined,
    LogoutOutlined,
    UserOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAgentList, publishAgent, deleteAgent } from '@/api/agent';
import { logout } from '@/api/user';
import { AiAgent } from '@/types';
import '../styles/dashboard.css';
import LogoutTransition from '@/components/transitions/LogoutTransition';

// ... (keep utility functions) ...
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
    const [activeTab, setActiveTab] = useState<'agents' | 'knowledge'>('agents');

    // 退出登录动画状态
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [logoutPosition, setLogoutPosition] = useState({ x: 0, y: 0 });
    const userAvatarRef = useRef<HTMLDivElement>(null);

    // ... (keep useEffect and loadAgents) ...
    // Mock Knowledge Base Data
    const knowledgeStats = {
        total: 12,
        indexed: 10,
        processing: 2
    };

    const mockDocs = [
        { id: '1', name: '产品手册_v2.0.pdf', type: 'PDF', size: '2.5 MB', status: 'indexed', date: '2023-12-20' },
        { id: '2', name: 'API接口文档.md', type: 'Markdown', size: '128 KB', status: 'indexed', date: '2023-12-19' },
        { id: '3', name: '用户常见问题.txt', type: 'TXT', size: '56 KB', status: 'processing', date: '2023-12-18' },
    ];

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

    const handleDelete = async (agentId: string, agentName: string) => {
        Modal.confirm({
            title: '确认删除',
            icon: <DeleteOutlined className="text-red-500" />,
            content: `确定要删除 Agent "${agentName}" 吗？此操作不可恢复。`,
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await deleteAgent(agentId);
                    message.success('删除成功');
                    loadAgents();
                } catch (error: any) {
                    message.error(error.message || '删除失败');
                }
            }
        });
    };

    const handleLogout = async () => {
        // 获取头像位置作为动画起点
        if (userAvatarRef.current) {
            const rect = userAvatarRef.current.getBoundingClientRect();
            setLogoutPosition({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            });
        }

        Modal.confirm({
            title: '确认退出',
            icon: <LogoutOutlined className="text-orange-500" />,
            content: '确定要退出登录吗？',
            okText: '确认退出',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    // 1. 触发动画
                    setIsLoggingOut(true);

                    // 2. 调用API（并行）
                    const logoutPromise = logout();

                    // 3. 等待动画和API
                    await Promise.all([
                        logoutPromise,
                        new Promise(resolve => setTimeout(resolve, 800)) // 至少展示800ms动画
                    ]);

                    message.success('已退出登录');
                    localStorage.removeItem('token');
                    navigate('/login');
                } catch (error) {
                    console.error('退出登录失败', error);
                    // 失败也强制退出
                    setTimeout(() => {
                        localStorage.removeItem('token');
                        navigate('/login');
                    }, 800);
                }
            }
        });
    };

    // 用户下拉菜单项
    const userMenuItems: MenuProps['items'] = [
        {
            key: 'user-info',
            label: (
                <div className="px-1 py-2">
                    <div className="font-semibold text-gray-800">用户</div>
                    <div className="text-xs text-gray-400">欢迎使用 AI Workbench</div>
                </div>
            ),
            disabled: true,
        },
        { type: 'divider' },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: '账户设置',
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: <span className="text-red-500">退出登录</span>,
            onClick: handleLogout,
        },
    ];

    const filteredAgents = agents.filter(agent => {
        const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
        const matchesSearch = agent.agentName.toLowerCase().includes(searchText.toLowerCase()) ||
            (agent.description || '').toLowerCase().includes(searchText.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const stats = activeTab === 'agents' ? {
        card1: { label: '总智能体', value: agents.length, icon: <ThunderboltOutlined />, color: 'blue', subtext: '活跃运行中' },
        card2: { label: '已发布', value: agents.filter(a => a.status === 1).length, icon: <CheckCircleOutlined />, color: 'emerald', total: agents.length },
        card3: { label: '草稿箱', value: agents.filter(a => a.status === 0).length, icon: <FileTextOutlined />, color: 'orange', total: agents.length }
    } : {
        card1: { label: '总文档', value: knowledgeStats.total, icon: <DatabaseOutlined />, color: 'purple', subtext: '知识库容量' },
        card2: { label: '已索引', value: knowledgeStats.indexed, icon: <CheckCircleOutlined />, color: 'emerald', total: knowledgeStats.total },
        card3: { label: '处理中', value: knowledgeStats.processing, icon: <Spin indicator={<LoadingOutlined spin />} />, color: 'blue', total: knowledgeStats.total }
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
                        <Dropdown
                            menu={{ items: userMenuItems }}
                            placement="bottomRight"
                            trigger={['click']}
                            overlayClassName="user-dropdown"
                        >
                            <div
                                ref={userAvatarRef}
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md cursor-pointer hover:scale-105 transition-transform hover:shadow-lg"
                            >
                                <UserOutlined />
                            </div>
                        </Dropdown>
                    </div>
                </div>
            </div>

            {/* Logout Transition Overlay */}
            <LogoutTransition visible={isLoggingOut} position={logoutPosition} />

            {/* Scrollable Content Area */}
            <div className={`flex-1 overflow-y-auto ${isLoggingOut ? 'logging-out' : ''}`}>
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

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-8 mb-8 border-b border-gray-200/50 px-2 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                        <button
                            onClick={() => setActiveTab('agents')}
                            className={`pb-4 text-base font-medium transition-all relative group ${activeTab === 'agents' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <div className="flex items-center gap-2">
                                <RobotOutlined className="text-lg" />
                                <span>我的智能体</span>
                            </div>
                            {activeTab === 'agents' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/50" />
                            )}
                        </button>
                        {/* <button
                            onClick={() => setActiveTab('knowledge')}
                            className={`pb-4 text-base font-medium transition-all relative group ${activeTab === 'knowledge' ? 'text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <div className="flex items-center gap-2">
                                <ReadOutlined className="text-lg" />
                                <span>知识库</span>
                            </div>
                            {activeTab === 'knowledge' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-full shadow-lg shadow-purple-500/50" />
                            )}
                        </button> */}
                    </div>

                    {/* Hero Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className={`stat-card bg-gradient-to-br ${activeTab === 'agents' ? 'from-blue-500 to-indigo-600' : 'from-purple-500 to-pink-600'} rounded-2xl p-6 text-white shadow-xl transform hover:-translate-y-1 transition-all duration-300 animate-fade-in-up`} style={{ animationDelay: '100ms' }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-white/80 font-medium mb-1">{stats.card1.label}</p>
                                    <h3 className="text-4xl font-bold">{stats.card1.value}</h3>
                                </div>
                                <div className="stat-card-icon bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                    <span className="text-2xl">{stats.card1.icon}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                <span className="text-sm text-white/90">{stats.card1.subtext}</span>
                            </div>
                        </div>

                        <div className="stat-card bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-gray-500 font-medium">{stats.card2.label}</div>
                                <div className="stat-card-icon bg-emerald-50 p-2.5 rounded-xl">
                                    <CheckCircleOutlined className="text-emerald-500 text-xl" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.card2.value}</h3>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${stats.card2.total ? (stats.card2.value / stats.card2.total) * 100 : 0}%` }} />
                            </div>
                        </div>

                        <div className="stat-card bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-gray-500 font-medium">{stats.card3.label}</div>
                                <div className={`stat-card-icon ${activeTab === 'agents' ? 'bg-orange-50' : 'bg-blue-50'} p-2.5 rounded-xl`}>
                                    <span className={`${activeTab === 'agents' ? 'text-orange-500' : 'text-blue-500'} text-xl`}>{stats.card3.icon}</span>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.card3.value}</h3>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className={`bg-gradient-to-r ${activeTab === 'agents' ? 'from-orange-400 to-orange-600' : 'from-blue-400 to-blue-600'} h-full rounded-full transition-all duration-500`} style={{ width: `${stats.card3.total ? (stats.card3.value / stats.card3.total) * 100 : 0}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                        {activeTab === 'agents' ? (
                            <div className="bg-white/70 backdrop-blur-md p-1.5 rounded-xl border border-white/50 shadow-sm flex gap-1">
                                {[
                                    { label: '全部', value: 'all', count: agents.length },
                                    { label: '草稿', value: 0, count: agents.filter(a => a.status === 0).length },
                                    { label: '已发布', value: 1, count: agents.filter(a => a.status === 1).length },
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
                        ) : (
                            <div className="bg-white/70 backdrop-blur-md p-1.5 rounded-xl border border-white/50 shadow-sm flex gap-1">
                                <button className="filter-tab px-5 py-2 text-sm font-semibold rounded-lg active bg-white text-gray-900 shadow-md flex items-center gap-2">
                                    全部文档
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">12</span>
                                </button>
                                <button className="filter-tab px-5 py-2 text-sm font-semibold rounded-lg text-gray-500 hover:bg-white/50 flex items-center gap-2">
                                    已索引
                                </button>
                            </div>
                        )}

                        <div className="flex gap-4 w-full md:w-auto">
                            <Input
                                placeholder={activeTab === 'agents' ? "搜索智能体..." : "搜索知识库文档..."}
                                prefix={<SearchOutlined className="text-gray-400" />}
                                className="flex-1 md:w-64 rounded-xl border-gray-200/50 bg-white/70 backdrop-blur-sm focus:bg-white transition-all h-11"
                                allowClear
                                onChange={e => setSearchText(e.target.value)}
                                variant="filled"
                            />
                            <Button
                                type="primary"
                                size="large"
                                icon={activeTab === 'agents' ? <PlusOutlined /> : <CloudUploadOutlined />}
                                onClick={handleCreate}
                                className={`${activeTab === 'agents' ? 'bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500'} border-none shadow-lg h-11 px-6 rounded-xl font-semibold transition-all`}
                            >
                                {activeTab === 'agents' ? '新建' : '上传'}
                            </Button>
                        </div>
                    </div>

                    {/* Grid */}
                    {activeTab === 'agents' ? (
                        <>
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
                                                    <Tooltip title="删除">
                                                        <Button type="text" shape="circle" icon={<DeleteOutlined />} className="text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDelete(agent.agentId, agent.agentName); }} />
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
                        </>
                    ) : (
                        // Knowledge Base Content
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {mockDocs.map((doc, index) => (
                                <div key={doc.id} className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg p-5 flex flex-col hover:shadow-xl transition-all duration-300 cursor-pointer group animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-md ${doc.type === 'PDF' ? 'bg-red-500' : doc.type === 'Markdown' ? 'bg-black' : 'bg-blue-500'}`}>
                                            {doc.type === 'PDF' ? <FilePdfOutlined /> : doc.type === 'Markdown' ? <FileMarkdownOutlined /> : <FileTextOutlined />}
                                        </div>
                                        <Tooltip title={doc.status === 'indexed' ? '已索引' : '处理中'}>
                                            <div className={`w-2.5 h-2.5 rounded-full ${doc.status === 'indexed' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                                        </Tooltip>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1 truncate group-hover:text-purple-600 transition-colors">{doc.name}</h3>
                                    <p className="text-gray-400 text-xs mb-4">上传于 {doc.date} • {doc.size}</p>
                                    <div className="mt-auto flex gap-2">
                                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">{doc.type}</span>
                                        <span className={`text-xs px-2 py-1 rounded ${doc.status === 'indexed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {doc.status === 'indexed' ? '可用' : '解析中'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div className="create-card bg-white/40 backdrop-blur-sm border-2 border-dashed border-purple-200/50 rounded-2xl flex flex-col justify-center items-center text-purple-400 cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all duration-300 min-h-[180px] group animate-fade-in-up">
                                <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-purple-100 transition-all duration-300">
                                    <CloudUploadOutlined className="text-2xl text-purple-500" />
                                </div>
                                <span className="font-semibold text-purple-600/80">上传文档</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
