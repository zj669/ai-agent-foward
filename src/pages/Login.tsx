
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Button, message, Form } from 'antd';
import { LockOutlined, MailOutlined, ThunderboltOutlined } from '@ant-design/icons';
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
    const [rememberMe, setRememberMe] = useState(false);

    const { control, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormByType>({
        resolver: zodResolver(loginSchema),
    });

    // Check for saved credentials
    useEffect(() => {
        const savedCreds = localStorage.getItem('login_credentials');
        if (savedCreds) {
            try {
                const { email, password } = JSON.parse(atob(savedCreds));
                setValue('email', email);
                setValue('password', password);
                setRememberMe(true);
            } catch (e) {
                console.error('Failed to parse saved credentials', e);
                localStorage.removeItem('login_credentials');
            }
        }
    }, [setValue]);

    const onSubmit = async (data: LoginFormByType) => {
        setLoading(true);
        try {
            const res: any = await request.post('/client/user/login', {
                email: data.email,
                password: data.password
            });

            if (res && res.token) {
                localStorage.setItem('token', res.token);

                // Handle Remember Me
                if (rememberMe) {
                    const creds = btoa(JSON.stringify({ email: data.email, password: data.password }));
                    localStorage.setItem('login_credentials', creds);
                } else {
                    localStorage.removeItem('login_credentials');
                }

                message.success('登录成功');
                navigate('/dashboard');
            } else {
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
        <div className="min-h-screen w-full flex bg-background font-sans overflow-hidden">
            {/* Left Side - Artistic Background */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-ink-900 items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900"></div>
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500 blur-[120px] animate-pulse-slow"></div>
                    <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-purple-500 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="relative z-10 p-12 text-white max-w-lg">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-8 shadow-glow animate-float">
                        <ThunderboltOutlined className="text-3xl" />
                    </div>
                    <h1 className="text-5xl font-bold mb-6 leading-tight">
                        构建下一代<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">智能体工作流</span>
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed opacity-90">
                        释放 AI 的无限潜能。通过直观的可视化编排，打造属于您的超级智能助手。
                    </p>
                </div>

                {/* Glass decoration */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
                {/* Mobile Background Blob */}
                <div className="lg:hidden absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-indigo-200 rounded-full blur-[80px] opacity-40 pointer-events-none"></div>

                <div className="w-full max-w-md bg-white/80 backdrop-blur-xl md:bg-transparent p-8 rounded-3xl md:p-0 shadow-paper md:shadow-none animate-fade-in-up">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-ink-900 mb-2">欢迎回来</h2>
                        <p className="text-ink-500">请输入您的账号信息以继续</p>
                    </div>

                    <Form onFinish={handleSubmit(onSubmit)} layout="vertical" size="large" className="space-y-5">
                        <Form.Item
                            validateStatus={errors.email ? 'error' : ''}
                            help={errors.email?.message}
                            label={<span className="text-ink-700 font-medium">邮箱地址</span>}
                        >
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        prefix={<MailOutlined className="text-ink-400 mr-2" />}
                                        placeholder="name@company.com"
                                        className="h-12 bg-slate-50 border-slate-200 text-ink-900 hover:border-indigo-400 focus:border-indigo-500 focus:bg-white transition-all rounded-xl"
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            validateStatus={errors.password ? 'error' : ''}
                            help={errors.password?.message}
                            label={<span className="text-ink-700 font-medium">密码</span>}
                        >
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <Input.Password
                                        {...field}
                                        prefix={<LockOutlined className="text-ink-400 mr-2" />}
                                        placeholder="请输入密码"
                                        className="h-12 bg-slate-50 border-slate-200 text-ink-900 hover:border-indigo-400 focus:border-indigo-500 focus:bg-white transition-all rounded-xl"
                                    />
                                )}
                            />
                        </Form.Item>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer text-ink-500 hover:text-ink-700">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="rounded border-slate-300 text-accent focus:ring-accent"
                                />
                                <span>记住我</span>
                            </label>
                            <a href="#" className="font-medium text-accent hover:text-accent-hover transition-colors">忘记密码？</a>
                        </div>

                        <Form.Item className="pt-2">
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                size="large"
                                loading={loading}
                                className="h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none shadow-lg shadow-indigo-200 font-semibold text-lg transition-all transform hover:-translate-y-0.5"
                            >
                                登 录
                            </Button>
                        </Form.Item>
                    </Form>

                    <p className="mt-8 text-center text-ink-500">
                        还没有账号？
                        <Link to="/register" className="ml-2 font-semibold text-accent hover:text-accent-hover transition-colors">
                            立即注册
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
