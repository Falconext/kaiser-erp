
import { Icon } from '@iconify/react';
import { useRef } from 'react';

interface CircularImageUploaderProps {
    imageUrl?: string | null;
    onFileSelect: (file: File) => void;
    className?: string;
}

export default function CircularImageUploader({
    imageUrl,
    onFileSelect,
    className = ''
}: CircularImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    const theme = {
        border: 'border-blue-100',
        icon: 'text-blue-300'
    };

    return (
        <div className={`w-24 h-24 rounded-full p-1 border-2 ${theme.border} bg-white dark:bg-slate-800 ${className}`}>
            <div className="w-full h-full bg-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden relative group cursor-pointer">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="Upload"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <Icon icon="solar:gallery-bold-duotone" className={`w-12 h-12 ${theme.icon}`} />
                )}

                {/* Overlay for upload */}
                <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Icon icon="solar:camera-add-bold" className="text-white w-8 h-8" />
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
}
