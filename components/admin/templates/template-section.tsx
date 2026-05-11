// TemplateSection.tsx

import { motion } from "framer-motion";
import { LayoutTemplate, Eye, Copy, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge";
import { Button } from "@/components/ui/button";

interface TemplateSectionProps {
    title: string;
    icon: any;
    templates: any[];
    type: string;
    color: string;
    isLoading: boolean;
    onShowPreview: (template: any) => void;
}

const TemplateSection = ({ title, icon: Icon, templates, type, color, isLoading, onShowPreview }: TemplateSectionProps) => {

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
        >
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${color}`}>
            <Icon className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{templates.length}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
                <p className="text-slate-400 col-span-full">Loading...</p>
            ) : templates.length === 0 ? (
                <p className="text-slate-400 col-span-full">No {title.toLowerCase()} yet</p>
            ) : (
            templates.map((template : any, i) => (
                <motion.div
                    key={template.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                <div className={`h-28 ${color} opacity-10 group-hover:opacity-20 transition-opacity flex items-center justify-center cursor-pointer`}>
                    <LayoutTemplate className="h-10 w-10 opacity-30 ext-white" />
                </div>
                <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                    <div>
                        <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm capitalize">{`${template.name as string}`.replace('_', ' ')} </h3>
                        {template.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{template.description}</p>
                        )}
                    </div>
                    <div className="flex gap-1">
                        {template.isDefault && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">Default</span>
                        )}
                    </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <StatusBadge status={template.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                        <span className="text-[10px] text-slate-400">{new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onShowPreview}>
                            <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-600">
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
                </motion.div>
            ))
            )}
        </div>
        </motion.div>
  );
};

  export default TemplateSection;
