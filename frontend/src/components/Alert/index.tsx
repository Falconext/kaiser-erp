
import useAlertStore from "@/zustand/alert";
import Loading from "../../components/Loading";
import Toast from "../Toast";
import { AnimatePresence, motion } from 'framer-motion';
import { listStagger } from '@/lib/motion/presets';
import './styles.css';

const Alert = () => {
    const { alerts, loading } = useAlertStore()
    return (
        <div className="alert-container">
            {loading && <Loading />}
            <motion.div className="toast-stack" variants={listStagger} initial="initial" animate="animate">
                <AnimatePresence mode="popLayout">
                    {alerts.map((alert) => (
                        <Toast
                            key={alert.id}
                            id={alert.id}
                            title={
                                alert.title ||
                                (alert.type === "success"
                                    ? "Éxito"
                                    : alert.type === "notification"
                                    ? "Información"
                                    : alert.type === "warning"
                                    ? "Advertencia"
                                    : "Error")
                            }
                            message={alert.message}
                            type={alert.type}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default Alert;
