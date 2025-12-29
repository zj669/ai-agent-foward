
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
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 font-sans">
            {/* Main Card */}
            <div className="w-full max-w-md bg-paper shadow-float rounded-2xl p-10 relative overflow-hidden animate-fade-in-up">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 shadow-paper mb-4">
                        <RocketOutlined className="text-3xl text-accent" />
                    </div>
                    <h2 className="text-3xl font-bold text-ink-900 mb-2">欢迎回来</h2>
                    <p className="text-ink-400">登录您的 AI Workbench 账号</p>
                </div>

                <Form onFinish={handleSubmit(onSubmit)} layout="vertical" size="large" className="space-y-4">
                    <Form.Item
                        validateStatus={errors.email ? 'error' : ''}
                        help={errors.email?.message}
                        label={<span className="text-ink-700 font-medium ml-1">邮箱地址</span>}
                    >
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    prefix={<MailOutlined className="text-ink-400 mr-2" />}
                                    placeholder="name@company.com"
                                    className="rounded-xl h-12 bg-transparent border-border text-ink-900 placeholder:text-ink-400 focus:border-accent hover:border-accent/50 transition-all font-medium"
                                />
                            )}
                        />
                    </Form.Item>

                    <Form.Item
                        validateStatus={errors.password ? 'error' : ''}
                        help={errors.password?.message}
                        label={<span className="text-ink-700 font-medium ml-1">密码</span>}
                        className="mb-6"
                    >
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <Input.Password
                                    {...field}
                                    prefix={<LockOutlined className="text-ink-400 mr-2" />}
                                    placeholder="••••••••"
                                    className="rounded-xl h-12 bg-transparent border-border text-ink-900 placeholder:text-ink-400 focus:border-accent hover:border-accent/50 transition-all font-medium"
                                />
                            )}
                        />
                    </Form.Item>

                    <div className="flex items-center justify-between mb-6 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer text-ink-400 hover:text-ink-700">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="rounded border-slate-300 text-accent focus:ring-accent"
                            />
                            <span>记住我</span>
                        </label>
                        <a href="#" className="font-medium text-accent hover:text-accent-hover">忘记密码？</a>
                    </div>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            size="large"
                            loading={loading}
                            className="h-12 rounded-xl bg-ink-900 hover:bg-slate-800 border-none shadow-lg shadow-slate-200 transform hover:-translate-y-0.5 transition-all duration-200 font-bold text-lg text-white"
                        >
                            登 录
                        </Button>
                    </Form.Item>
                </Form>

                <div className="mt-8 text-center">
                    <p className="text-ink-400">
                        还没有账号？
                        <Link to="/register" className="ml-2 font-semibold text-accent hover:text-accent-hover transition-colors">
                            立即注册
                        </Link>
                    </p>
                </div>

                {/* Footer simple copyright */}
                <div className="mt-8 text-center text-xs text-ink-400 opacity-60">
                    &copy; {new Date().getFullYear()} AI Workbench
                </div>
            </div>
        </div>
    );
};


export default Login;
