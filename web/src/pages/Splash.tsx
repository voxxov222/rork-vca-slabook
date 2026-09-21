import { Navigate } from 'react-router-dom';
/** The landing experience now shares the real collector workspace and branding. */
export default function Splash() { return <Navigate to="/home" replace/>; }
