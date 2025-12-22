import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Tag, Empty, Spin, message, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAgentList } from '@/api/agent';
import { AiAgent } from '@/types';

const { Meta } = Card;

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
            // Ensure data is an array
            if (Array.isArray(data)) {
                setAgents(data);
            } else {
                setAgents([]);
                message.warning('获取到的Agent列表格式不正确');
            }
        } catch (error) {
            console.error(error);
            message.error('加载Agent列表失败');
        } finally {
            setLoading(false);
        }
    };

    const filteredAgents = agents.filter(agent => {
        const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
        const matchesSearch = agent.agentName.toLowerCase().includes(searchText.toLowerCase()) ||
            agent.description?.toLowerCase().includes(searchText.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusTag = (status: number) => {
        switch (status) {
            case 0: return <Tag color="orange">草稿</Tag>;
            case 1: return <Tag color="green">已发布</Tag>;
            case 2: return <Tag color="red">已停用</Tag>;
            default: return <Tag>未知</Tag>;
        }
    };

    const handleCreate = () => {
        navigate('/agent/editor');
    };

    const handleEdit = (id: string | number) => {
        // Logic to handle numeric id or string agentId
        // Usually Editor needs ID to load.
        navigate(`/agent/editor/${id}`);
    };

    const handleChat = (agentId: string) => {
        // Chat uses agentId (string) usually
        // Navigate to chat (Not implemented yet in this phase, or use legacy chat?)
        // We will point to legacy chat or waiting for Phase 6.
        // For now, let's just log or alert.
        message.info('聊天功能将在后续阶段实现');
        // navigate(`/agent/chat/${agentId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">我的Agent</h1>
                    <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
                        新建Agent
                    </Button>
                </div>

                <Card className="mb-6 shadow-sm rounded-lg" bordered={false}>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex gap-2">
                            <Button type={filterStatus === 'all' ? 'primary' : 'default'} onClick={() => setFilterStatus('all')}>
                                全部
                            </Button>
                            <Button type={filterStatus === 0 ? 'primary' : 'default'} onClick={() => setFilterStatus(0)}>
                                草稿
                            </Button>
                            <Button type={filterStatus === 1 ? 'primary' : 'default'} onClick={() => setFilterStatus(1)}>
                                已发布
                            </Button>
                            <Button type={filterStatus === 2 ? 'primary' : 'default'} onClick={() => setFilterStatus(2)}>
                                已停用
                            </Button>
                        </div>

                        <Input
                            placeholder="搜索Agent名称或描述"
                            prefix={<SearchOutlined />}
                            className="w-full md:w-64"
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </Card>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spin size="large" />
                    </div>
                ) : filteredAgents.length > 0 ? (
                    <Row gutter={[24, 24]}>
                        {filteredAgents.map(agent => (
                            <Col xs={24} sm={12} lg={8} xl={6} key={agent.id}>
                                <Card
                                    hoverable
                                    className="h-full flex flex-col shadow-sm hover:shadow-md transition-all rounded-lg overflow-hidden"
                                    actions={[
                                        <EditOutlined key="edit" onClick={() => handleEdit(agent.id)} />,
                                        agent.status === 1 ? <PlayCircleOutlined key="play" onClick={() => handleChat(agent.agentId)} /> : null,
                                        <DeleteOutlined key="delete" className="text-red-500" />
                                    ].filter(Boolean)}
                                >
                                    <div className="absolute top-4 right-4">
                                        {getStatusTag(agent.status)}
                                    </div>
                                    <Meta
                                        title={<div className="pr-12 truncate text-lg font-semibold" title={agent.agentName}>{agent.agentName}</div>}
                                        description={
                                            <div className="h-20 overflow-hidden text-ellipsis line-clamp-3 text-gray-500 mt-2">
                                                {agent.description || '暂无描述'}
                                            </div>
                                        }
                                    />
                                    <div className="mt-4 text-xs text-gray-400">
                                        更新于: {new Date(agent.updateTime).toLocaleDateString()}
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Empty description="未找到Agent" className="py-20" />
                )}
            </div>
        </div>
    );
};

export default Dashboard;
