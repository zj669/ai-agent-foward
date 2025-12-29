
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Button, message, Form } from 'antd';
import { LockOutlined, MailOutlined, ThunderboltOutlined, TeamOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import request from '@/utils/request';
import '../styles/login.css';

const loginSchema = z.object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少6位'),
});

type LoginFormByType = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [sloganText, setSloganText] = useState('');
    const fullSlogan = "构建下一代智能体工作流";

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

    // Slogan typing effect
    useEffect(() => {
        let index = 0;
        const timer = setInterval(() => {
            setSloganText(fullSlogan.slice(0, index));
            index++;
            if (index > fullSlogan.length) {
                clearInterval(timer);
            }
        }, 100);
        return () => clearInterval(timer);
    }, []);

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
        <div className="min-h-screen w-full flex bg-slate-900 overflow-hidden relative font-sans">
            {/* Background Particles (Abstract) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="particle opacity-20"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: `${Math.random() * 4 + 1}px`,
                            height: `${Math.random() * 4 + 1}px`,
                            animationDelay: `${Math.random() * 5}s`,
                            backgroundColor: i % 2 === 0 ? '#6366f1' : '#8b5cf6'
                        }}
                    />
                ))}
            </div>

            {/* Left Section - Brand & Features */}
            <div className="hidden lg:flex lg:w-[50%] relative flex-col justify-between p-16 text-white z-10">

                {/* Logo Area */}
                <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg brand-logo-glow">
                        <RocketOutlined className="text-2xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">AI Workbench</h1>
                        <span className="text-indigo-300 text-xs font-medium tracking-widest uppercase">Enterprise Edition</span>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="max-w-xl">
                    <h2 className="text-5xl font-bold mb-6 leading-tight typing-cursor min-h-[1.2em]">
                        {sloganText}
                    </h2>
                    <p className="text-lg text-slate-300 mb-10 leading-relaxed font-light opacity-0 animate-fade-in-up" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
                        释放 AI 的无限潜能。通过可视化的工作流编排，轻松构建、测试和部署强大的智能代理系统。
                    </p>

                    <div className="space-y-6">
                        <div className="feature-item flex items-center gap-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <ThunderboltOutlined className="text-xl" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-lg">可视化编排</h3>
                                <p className="text-slate-400 text-sm">拖拽式节点设计，所见即所得</p>
                            </div>
                        </div>

                        <div className="feature-item flex items-center gap-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                <TeamOutlined className="text-xl" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-lg">多人实时协作</h3>
                                <p className="text-slate-400 text-sm">团队成员无缝配合，即时同步</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Copyright */}
                <div className="text-slate-500 text-sm opacity-0 animate-fade-in-up" style={{ animationDelay: '2.5s', animationFillMode: 'forwards' }}>
                    &copy; {new Date().getFullYear()} AI Workbench. Created with ❤️ for Developers.
                </div>
            </div>

            {/* Right Section - Login Form */}
            <div className="w-full lg:w-[50%] flex items-center justify-center p-8 z-20 h-full">
                <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-2xl relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.4s' }}>

                    {/* Decorative top gradient */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                    {/* Mobile Logo Show */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg mb-4">
                            <RocketOutlined className="text-3xl text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">欢迎回来</h1>
                        <p className="text-slate-400 mt-2">登录您的 AI Workbench 账号</p>
                    </div>

                    <div className="text-left mb-8 hidden lg:block">
                        <h2 className="text-3xl font-bold text-white mb-2">欢迎回来 👋</h2>
                        <p className="text-slate-400">请输入您的账号信息以继续访问</p>
                    </div>

                    <Form onFinish={handleSubmit(onSubmit)} layout="vertical" size="large" className="space-y-4">
                        <Form.Item
                            validateStatus={errors.email ? 'error' : ''}
                            help={errors.email?.message}
                            label={<span className="text-slate-300 font-medium ml-1">邮箱地址</span>}
                        >
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        prefix={<MailOutlined className="text-slate-400 mr-2" />}
                                        placeholder="name@company.com"
                                        className="rounded-xl h-12 bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 hover:border-indigo-400/50 transition-all font-medium"
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            validateStatus={errors.password ? 'error' : ''}
                            help={errors.password?.message}
                            label={<span className="text-slate-300 font-medium ml-1">密码</span>}
                            className="mb-6"
                        >
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <Input.Password
                                        {...field}
                                        prefix={<LockOutlined className="text-slate-400 mr-2" />}
                                        placeholder="••••••••"
                                        className="rounded-xl h-12 bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 hover:border-indigo-400/50 transition-all font-medium"
                                    />
                                )}
                            />
                        </Form.Item>

                        <div className="flex items-center justify-between mb-6 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="rounded border-slate-600 bg-transparent text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                                />
                                <span>记住我</span>
                            </label>
                            <a href="#" className="font-medium text-indigo-400 hover:text-indigo-300">忘记密码？</a>
                        </div>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                size="large"
                                loading={loading}
                                className="h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all duration-200 font-bold text-lg"
                            >
                                登 录
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-400">
                            还没有账号？
                            <Link to="/register" className="ml-2 font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                                立即注册
                            </Link>
                        </p>
                    </div>

                    {/* Social Login Divider (Visual Only) */}
                    <div className="mt-8 relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-transparent text-slate-500">或通过以下方式登录</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default Login;
