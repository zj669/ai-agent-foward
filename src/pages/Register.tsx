import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Button, message, Form, Row, Col } from 'antd';
import { LockOutlined, MailOutlined, SafetyCertificateOutlined, RocketOutlined, GlobalOutlined, CodeOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import request from '@/utils/request';
import '../styles/login.css';

const registerSchema = z.object({
    email: z.string().email('请输入有效的邮箱地址'),
    code: z.string().min(4, '请输入验证码'),
    password: z.string().min(6, '密码至少6位'),
});

type RegisterFormType = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [sloganText, setSloganText] = useState('');
    const fullSlogan = "加入智能体革命";

    const { control, handleSubmit, getValues, trigger, formState: { errors } } = useForm<RegisterFormType>({
        resolver: zodResolver(registerSchema),
    });

    // Slogan typing effect
    useEffect(() => {
        let index = 0;
        const timer = setInterval(() => {
            setSloganText(fullSlogan.slice(0, index));
            index++;
            if (index > fullSlogan.length) {
                clearInterval(timer);
            }
        }, 150);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const sendCode = async () => {
        const email = getValues('email');
        const isEmailValid = await trigger('email');

        if (!isEmailValid || !email) {
            message.error('请先输入有效的邮箱地址');
            return;
        }

        try {
            await request.post('/client/user/email/sendCode', { email });
            message.success('验证码已发送');
            setCountdown(30);
        } catch (error: any) {
            message.error(error.message || '发送验证码失败');
        }
    };

    const onSubmit = async (data: RegisterFormType) => {
        setLoading(true);
        try {
            // 1. 注册
            await request.post('/client/user/email/register', {
                email: data.email,
                code: data.code,
                password: data.password
            });

            message.success('注册成功，正在自动登录...');

            // 2. 自动登录
            try {
                const res: any = await request.post('/client/user/login', {
                    email: data.email,
                    password: data.password
                });

                if (res && res.token) {
                    localStorage.setItem('token', res.token);
                    message.success('登录成功');
                    navigate('/dashboard');
                } else {
                    // 登录失败但注册成功
                    message.warning('自动登录失败，请手动登录');
                    navigate('/login');
                }
            } catch (loginError) {
                console.error('Auto login failed:', loginError);
                message.warning('自动登录失败，请手动登录');
                navigate('/login');
            }

        } catch (error: any) {
            console.error(error);
            message.error(error.message || '注册失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-900 overflow-hidden relative font-sans">
            {/* Background Particles (Abstract) - Reused from Login */}
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
                            backgroundColor: i % 2 === 0 ? '#d946ef' : '#8b5cf6'
                        }}
                    />
                ))}
            </div>

            {/* Left Section - Brand & Features */}
            <div className="hidden lg:flex lg:w-[50%] relative flex-col justify-between p-16 text-white z-10">
                {/* Logo Area */}
                <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="w-12 h-12 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg brand-logo-glow">
                        <RocketOutlined className="text-2xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">AI Workbench</h1>
                        <span className="text-purple-300 text-xs font-medium tracking-widest uppercase">Join Community</span>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="max-w-xl">
                    <h2 className="text-5xl font-bold mb-6 leading-tight typing-cursor min-h-[1.2em]">
                        {sloganText}
                    </h2>
                    <p className="text-lg text-slate-300 mb-10 leading-relaxed font-light opacity-0 animate-fade-in-up" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
                        立即加入数千名开发者的行列，开始构建您的专属智能体。体验前所未有的开发效率与创新自由。
                    </p>

                    <div className="space-y-6">
                        <div className="feature-item flex items-center gap-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400">
                                <GlobalOutlined className="text-xl" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-lg">全球化部署</h3>
                                <p className="text-slate-400 text-sm">一键发布，覆盖全球边缘节点</p>
                            </div>
                        </div>

                        <div className="feature-item flex items-center gap-4 bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                <CodeOutlined className="text-xl" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-lg">开发者优先</h3>
                                <p className="text-slate-400 text-sm">强大的 API 支持与完善的文档</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Copyright */}
                <div className="text-slate-500 text-sm opacity-0 animate-fade-in-up" style={{ animationDelay: '2.5s', animationFillMode: 'forwards' }}>
                    &copy; {new Date().getFullYear()} AI Workbench. Created with ❤️ for Developers.
                </div>
            </div>

            {/* Right Section - Register Form */}
            <div className="w-full lg:w-[50%] flex items-center justify-center p-8 z-20 h-full">
                <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-2xl relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.4s' }}>

                    {/* Decorative top gradient */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500"></div>

                    {/* Mobile Logo Show */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 shadow-lg mb-4">
                            <RocketOutlined className="text-3xl text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">创建新账号</h1>
                        <p className="text-slate-400 mt-2">加入 AutoAgent，开启智能之旅</p>
                    </div>

                    <div className="text-left mb-8 hidden lg:block">
                        <h2 className="text-3xl font-bold text-white mb-2">创建新账号 🚀</h2>
                        <p className="text-slate-400">填写以下信息完成注册</p>
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
                                        className="rounded-xl h-12 bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500 hover:border-purple-400/50 transition-all font-medium"
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            validateStatus={errors.code ? 'error' : ''}
                            help={errors.code?.message}
                            label={<span className="text-slate-300 font-medium ml-1">验证码</span>}
                            className="mb-4"
                        >
                            <Controller
                                name="code"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        prefix={<SafetyCertificateOutlined className="text-slate-400 mr-2" />}
                                        placeholder="输入验证码"
                                        className="rounded-xl h-12 bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500 hover:border-purple-400/50 transition-all font-medium pr-2"
                                        suffix={
                                            <button
                                                type="button"
                                                onClick={sendCode}
                                                disabled={countdown > 0}
                                                className={`text-sm font-medium transition-colors px-3 py-1 rounded-lg ${countdown > 0
                                                    ? 'text-slate-500 cursor-not-allowed'
                                                    : 'text-purple-400 hover:text-purple-300 hover:bg-white/5 active:scale-95'
                                                    }`}
                                            >
                                                {countdown > 0 ? `${countdown}s后重发` : '获取验证码'}
                                            </button>
                                        }
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            validateStatus={errors.password ? 'error' : ''}
                            help={errors.password?.message}
                            label={<span className="text-slate-300 font-medium ml-1">密码</span>}
                            className="mb-8"
                        >
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <Input.Password
                                        {...field}
                                        prefix={<LockOutlined className="text-slate-400 mr-2" />}
                                        placeholder="设置密码 (至少6位)"
                                        className="rounded-xl h-12 bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500 hover:border-purple-400/50 transition-all font-medium"
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                size="large"
                                loading={loading}
                                className="h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-none shadow-lg shadow-purple-500/30 transform hover:-translate-y-0.5 transition-all duration-200 font-bold text-lg"
                            >
                                立即注册
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-400">
                            已有账号？
                            <Link to="/login" className="ml-2 font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                                直接登录
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
