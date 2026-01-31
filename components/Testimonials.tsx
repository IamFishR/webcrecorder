import React from 'react';
import { Icons } from './Icons';

export const Testimonials: React.FC = () => {
    return (
        <section className="py-20 px-6 w-full bg-gradient-to-b from-transparent to-black/40">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="p-6">
                        <div className="flex justify-center mb-4 text-primary">
                            <Icons.Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No Watermarks</h3>
                        <p className="text-gray-400 text-sm">Your content is yours. Clean, professional output every time.</p>
                    </div>
                    <div className="p-6 border-y md:border-y-0 md:border-x border-white/5">
                        <div className="flex justify-center mb-4 text-accent">
                            <Icons.Download className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Instant Export</h3>
                        <p className="text-gray-400 text-sm">Save directly to your device. No cloud processing wait times.</p>
                    </div>
                    <div className="p-6">
                        <div className="flex justify-center mb-4 text-green-400">
                            <Icons.Shield className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Secure & Private</h3>
                        <p className="text-gray-400 text-sm">Browser-based technology means your data stays safe.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};
