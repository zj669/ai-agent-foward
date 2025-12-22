import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, Input, Button, message, Form } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import request from '@/utils/request';

const loginSchema = z.object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少6位'),
});

type LoginFormByType = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { control, handleSubmit, formState: { errors } } = useForm<LoginFormByType>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormByType) => {
        setLoading(true);
        try {
            const res: any = await request.post('/client/user/login', {
                email: data.email,
                password: data.password
            });

            // Assuming res contains token directly or inside data object depending on request.ts interceptor
            // request.ts interceptor returns `data` from `{code, info, data}`.
            // So `res` is the payload.
            if (res && res.token) {
                localStorage.setItem('token', res.token);
                message.success('登录成功');
                navigate('/dashboard');
            } else {
                // Fallback if token is elsewhere
                message.error('登录失败: 未获取到Token');
            }
        } catch (error: any) {
            console.error(error);
            message.error(error.message || '登录失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                <Card
                    bordered={false}
                    className="shadow-2xl rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden"
                    bodyStyle={{ padding: '40px 32px' }}
                >
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 shadow-lg mb-6 transform rotate-3 hover:rotate-6 transition-transform duration-300">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">欢迎回来</h1>
                        <p className="mt-3 text-slate-400">登录您的 AI Agent 平台账号</p>
                    </div>

                    <Form onFinish={handleSubmit(onSubmit)} layout="vertical" size="large">
                        <Form.Item
                            validateStatus={errors.email ? 'error' : ''}
                            help={errors.email?.message}
                            className="mb-6"
                        >
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        prefix={<MailOutlined className="text-slate-400 text-lg mr-2" />}
                                        placeholder="邮箱地址"
                                        className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 hover:border-blue-500/50 focus:border-blue-500 hover:bg-black/30 focus:bg-black/30 transition-all rounded-xl h-12"
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            validateStatus={errors.password ? 'error' : ''}
                            help={errors.password?.message}
                            className="mb-8"
                        >
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <Input.Password
                                        {...field}
                                        prefix={<LockOutlined className="text-slate-400 text-lg mr-2" />}
                                        placeholder="密码"
                                        className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 hover:border-blue-500/50 focus:border-blue-500 hover:bg-black/30 focus:bg-black/30 transition-all rounded-xl h-12"
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item className="mb-6">
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                size="large"
                                loading={loading}
                                className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 border-none shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold text-lg"
                            >
                                登 录
                            </Button>
                        </Form.Item>

                        <div className="text-center">
                            <span className="text-slate-500">还没有账号？</span>
                            <Link to="/register" className="ml-2 text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                立即注册
                            </Link>
                        </div>
                    </Form>
                </Card>

                <div className="text-center mt-8 text-slate-600 text-sm">
                    &copy; {new Date().getFullYear()} AutoAgent Platform. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default Login;
