import { createBrowserRouter } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import AgentEditor from '@/pages/AgentEditor';
import AgentChat from '@/pages/AgentChat';
import LegacyChat from '@/pages/LegacyChat'; // Existing chat app

const router = createBrowserRouter([
    {
        path: '/',
        element: <Dashboard />, // Basic protection to be added later
    },
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/register',
        element: <Register />,
    },
    {
        path: '/dashboard',
        element: <Dashboard />,
    },
    {
        path: '/agent/editor/:id?',
        element: <AgentEditor />,
    },
    {
        path: '/agent/chat/:id',
        element: <AgentChat />,
    },
    {
        path: '/legacy-chat',
        element: <LegacyChat />
    }
]);

export default router;
