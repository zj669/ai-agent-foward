import request from '@/utils/request';

export interface UserInfo {
    id: number;
    username: string;
    email: string;
    phone?: string;
    token?: string;
}

/**
 * 获取当前登录用户信息
 */
export const getUserInfo = async (): Promise<UserInfo> => {
    return request.get('/client/user/info');
};

/**
 * 用户退出登录
 */
export const logout = async (): Promise<void> => {
    return request.post('/client/user/logout');
};
