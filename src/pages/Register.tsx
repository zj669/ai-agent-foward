import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, Input, Button, message, Form, Row, Col } from 'antd';
import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
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
            setCountdown(60);
        } catch (error: any) {
            message.error(error.message || '发送验证码失败');
        }
    };

    const onSubmit = async (data: RegisterFormType) => {
        setLoading(true);
        try {
            await request.post('/client/user/email/register', {
                email: data.email,
                code: data.code,
                password: data.password
            });

            message.success('注册成功，请登录');
            navigate('/login');
        } catch (error: any) {
            console.error(error);
            message.error(error.message || '注册失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                <Card
                    bordered={false}
                    className="shadow-2xl rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden"
                    bodyStyle={{ padding: '40px 32px' }}
                >
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 shadow-lg mb-4 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">创建新账号</h1>
                        <p className="mt-2 text-slate-400">加入 AutoAgent，开启智能之旅</p>
                    </div>

                    <Form onFinish={handleSubmit(onSubmit)} layout="vertical" size="large">
                        <Form.Item
                            validateStatus={errors.email ? 'error' : ''}
                            help={errors.email?.message}
                            className="mb-5"
                        >
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        prefix={<MailOutlined className="text-slate-400 text-lg mr-2" />}
                                        placeholder="邮箱地址"
                                        className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 hover:border-purple-500/50 focus:border-purple-500 hover:bg-black/30 focus:bg-black/30 transition-all rounded-xl h-11"
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item className="mb-5">
                            <Row gutter={8}>
                                <Col flex="auto">
                                    <Form.Item
                                        noStyle
                                        validateStatus={errors.code ? 'error' : ''}
                                        help={errors.code?.message}
                                    >
                                        <Controller
                                            name="code"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    prefix={<SafetyCertificateOutlined className="text-slate-400 text-lg mr-2" />}
                                                    placeholder="验证码"
                                                    className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 hover:border-purple-500/50 focus:border-purple-500 hover:bg-black/30 focus:bg-black/30 transition-all rounded-xl h-11"
                                                />
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col flex="none">
                                    <Button
                                        size="large"
                                        onClick={sendCode}
                                        disabled={countdown > 0}
                                        className={`h-11 rounded-xl border-white/10 text-white hover:text-white hover:border-purple-500/50 transition-all ${countdown > 0 ? 'bg-white/5' : 'bg-white/10 hover:bg-purple-600/80 hover:shadow-lg'}`}
                                    >
                                        {countdown > 0 ? `${countdown}s后重发` : '获取验证码'}
                                    </Button>
                                </Col>
                            </Row>
                            {errors.code && <div className="text-red-400 text-xs mt-1 ml-1">{errors.code.message}</div>}
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
                                        placeholder="设置密码 (至少6位)"
                                        className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 hover:border-purple-500/50 focus:border-purple-500 hover:bg-black/30 focus:bg-black/30 transition-all rounded-xl h-11"
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
                                className="h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 border-none shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold text-lg"
                            >
                                立即注册
                            </Button>
                        </Form.Item>

                        <div className="text-center">
                            <span className="text-slate-500">已有账号？</span>
                            <Link to="/login" className="ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors">
                                直接登录
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

export default Register;
