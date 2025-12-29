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
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 font-sans">
            {/* Main Card */}
            <div className="w-full max-w-md bg-paper shadow-float rounded-2xl p-10 relative overflow-hidden animate-fade-in-up">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 shadow-paper mb-4">
                        <RocketOutlined className="text-3xl text-accent" />
                    </div>
                    <h2 className="text-3xl font-bold text-ink-900 mb-2">创建新账号</h2>
                    <p className="text-ink-400">开启您的智能体创作之旅</p>
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
                        validateStatus={errors.code ? 'error' : ''}
                        help={errors.code?.message}
                        label={<span className="text-ink-700 font-medium ml-1">验证码</span>}
                        className="mb-4"
                    >
                        <Controller
                            name="code"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    prefix={<SafetyCertificateOutlined className="text-ink-400 mr-2" />}
                                    placeholder="输入验证码"
                                    className="rounded-xl h-12 bg-transparent border-border text-ink-900 placeholder:text-ink-400 focus:border-accent hover:border-accent/50 transition-all font-medium pr-2"
                                    suffix={
                                        <button
                                            type="button"
                                            onClick={sendCode}
                                            disabled={countdown > 0}
                                            className={`text-sm font-medium transition-colors px-3 py-1 rounded-lg ${countdown > 0
                                                ? 'text-ink-400 cursor-not-allowed'
                                                : 'text-accent hover:text-accent-hover hover:bg-slate-100 active:scale-95'
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
                        label={<span className="text-ink-700 font-medium ml-1">密码</span>}
                        className="mb-8"
                    >
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <Input.Password
                                    {...field}
                                    prefix={<LockOutlined className="text-ink-400 mr-2" />}
                                    placeholder="设置密码 (至少6位)"
                                    className="rounded-xl h-12 bg-transparent border-border text-ink-900 placeholder:text-ink-400 focus:border-accent hover:border-accent/50 transition-all font-medium"
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
                            className="h-12 rounded-xl bg-ink-900 hover:bg-slate-800 border-none shadow-lg shadow-slate-200 transform hover:-translate-y-0.5 transition-all duration-200 font-bold text-lg text-white"
                        >
                            立即注册
                        </Button>
                    </Form.Item>
                </Form>

                <div className="mt-8 text-center">
                    <p className="text-ink-400">
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
