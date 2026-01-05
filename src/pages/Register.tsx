import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Button, message, Form } from 'antd';
import { LockOutlined, MailOutlined, SafetyCertificateOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import request from '@/utils/request';

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

    const { control, handleSubmit, getValues, trigger, formState: { errors } } = useForm<RegisterFormType>({
        resolver: zodResolver(registerSchema),
    });

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
        <div className="min-h-screen w-full flex bg-background font-sans overflow-hidden">
            {/* Left Side - Artistic Background */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-ink-900 items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-bl from-slate-900 via-indigo-950 to-slate-900"></div>
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-600 blur-[100px] animate-pulse-slow"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-600 blur-[100px] animate-pulse-slow" style={{ animationDelay: '3s' }}></div>
                </div>

                <div className="relative z-10 p-12 text-white max-w-lg">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-8 shadow-glow animate-float">
                        <RocketOutlined className="text-3xl" />
                    </div>
                    <h1 className="text-5xl font-bold mb-6 leading-tight">
                        加入<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">智能体革命</span>
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed opacity-90">
                        立即创建账号，开始构建属于您的 AI 工作流。简单、强大、无与伦比。
                    </p>
                </div>

                {/* Glass decoration */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>

            {/* Right Side - Register Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
                {/* Mobile Background Blob */}
                <div className="lg:hidden absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-blue-200 rounded-full blur-[80px] opacity-40 pointer-events-none"></div>

                <div className="w-full max-w-md bg-white/80 backdrop-blur-xl md:bg-transparent p-8 rounded-3xl md:p-0 shadow-paper md:shadow-none animate-fade-in-up">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-ink-900 mb-2">创建新账号</h2>
                        <p className="text-ink-500">开启您的智能体创作之旅</p>
                    </div>

                    <Form onFinish={handleSubmit(onSubmit)} layout="vertical" size="large" className="space-y-4">
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
                            validateStatus={errors.code ? 'error' : ''}
                            help={errors.code?.message}
                            label={<span className="text-ink-700 font-medium">验证码</span>}
                        >
                            <Controller
                                name="code"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex gap-3">
                                        <Input
                                            {...field}
                                            prefix={<SafetyCertificateOutlined className="text-ink-400 mr-2" />}
                                            placeholder="输入验证码"
                                            className="h-12 bg-slate-50 border-slate-200 text-ink-900 hover:border-indigo-400 focus:border-indigo-500 focus:bg-white transition-all rounded-xl flex-1"
                                        />
                                        <Button
                                            size="large"
                                            onClick={sendCode}
                                            disabled={countdown > 0}
                                            className="h-12 rounded-xl bg-slate-100 text-ink-700 font-medium hover:bg-slate-200 border-none transition-all w-32"
                                        >
                                            {countdown > 0 ? `${countdown}s` : '发送验证码'}
                                        </Button>
                                    </div>
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
                                        placeholder="设置密码 (至少6位)"
                                        className="h-12 bg-slate-50 border-slate-200 text-ink-900 hover:border-indigo-400 focus:border-indigo-500 focus:bg-white transition-all rounded-xl"
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item className="pt-2">
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                size="large"
                                loading={loading}
                                className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-none shadow-lg shadow-blue-200 font-semibold text-lg transition-all transform hover:-translate-y-0.5"
                            >
                                立即注册
                            </Button>
                        </Form.Item>
                    </Form>

                    <p className="mt-8 text-center text-ink-500">
                        已有账号？
                        <Link to="/login" className="ml-2 font-semibold text-accent hover:text-accent-hover transition-colors">
                            直接登录
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
