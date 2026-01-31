import React from 'react';
import { Icons } from './Icons';

export const Features: React.FC = () => {
    const features = [
        {
            title: "High Quality",
            description: "Record in stunning 4K resolution. Crystal clear video for professional results.",
            icon: Icons.Video,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
        },
        {
            title: "Privacy First",
            description: "100% local processing. Your recordings never leave your device.",
            icon: Icons.Lock,
            color: "text-green-400",
            bg: "bg-green-400/10",
        },
        {
            title: "Unlimited",
            description: "No time limits. Record as long as you need without interruptions.",
            icon: Icons.Infinity,
            color: "text-purple-400",
            bg: "bg-purple-400/10",
        },
        {
            title: "Versatile",
            description: "Video, Audio, and Screen recording all in one powerful studio.",
            icon: Icons.Layers,
            color: "text-orange-400",
            bg: "bg-orange-400/10",
        },
    ];

    return (
        <section className="py-24 px-6 md:px-12 w-full max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-6">
                    Why Choose Lumina?
                </h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Built for creators, educators, and professionals who demand the best.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                    <div
                        key={index}
                        className="group p-8 rounded-3xl bg-surface/30 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all hover:-translate-y-1 duration-300"
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${feature.bg} ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                            <feature.icon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors">
                            {feature.title}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {feature.description}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
};
