import React, { useState } from 'react';
import { X, Building2, User, Phone, Mail, Users, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from "../convex/_generated/api";

interface RequestTrialDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RequestTrialDialog: React.FC<RequestTrialDialogProps> = ({ isOpen, onClose }) => {
    const submitRequest = useMutation(api.trialRequests.submitRequest);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        organizationType: '',
        organizationName: '',
        name: '',
        email: '',
        phoneNumber: '',
        employeeCount: '',
        details: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await submitRequest({
                ...formData,
                organizationType: formData.organizationType || 'Startup', // Default if mostly empty
            });
            setIsSuccess(true);
        } catch (error) {
            // Optionally handle error state
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-stone-900">Request a Trial</h2>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1 hover:bg-stone-200 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6">
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-stone-900">Request Received</h3>
                            <p className="text-stone-500 max-w-xs mx-auto">
                                Thank you for your interest. Our team will review your application and get back to you shortly.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-6 px-8 py-3 bg-stone-900 text-white rounded-full font-bold hover:bg-stone-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Organization Type */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> Organization Type
                                </label>
                                <select
                                    name="organizationType"
                                    required
                                    value={formData.organizationType}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold"
                                >
                                    <option value="" disabled>Select Organization Type</option>
                                    <option value="Startup">Startup</option>
                                    <option value="Educational Institution">Educational Institution</option>
                                    <option value="Incubator">Incubator</option>
                                    <option value="Accelerator">Accelerator</option>
                                    <option value="Enterprise">Enterprise</option>
                                    <option value="Individual">Individual</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Organization Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> Organization / Company Name
                                </label>
                                <input
                                    type="text"
                                    name="organizationName"
                                    required
                                    placeholder="e.g. Acme Corp"
                                    value={formData.organizationName}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Name */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                                        <User className="w-3 h-3" /> Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold"
                                    />
                                </div>
                                {/* Employees */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Employees
                                    </label>
                                    <select
                                        name="employeeCount"
                                        required
                                        value={formData.employeeCount}
                                        onChange={handleChange}
                                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold"
                                    >
                                        <option value="" disabled>Select Count</option>
                                        <option value="1-10">1-10</option>
                                        <option value="11-50">11-50</option>
                                        <option value="51-200">51-200</option>
                                        <option value="201-500">201-500</option>
                                        <option value="500+">500+</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> Work Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="john@company.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold"
                                    />
                                </div>
                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        required
                                        placeholder="+1 (555) 000-0000"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold"
                                    />
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> Additional Details (Optional)
                                </label>
                                <textarea
                                    name="details"
                                    rows={3}
                                    placeholder="Tell us about your needs..."
                                    value={formData.details}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold resize-none"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-nobel-gold transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                                        </>
                                    ) : (
                                        'Submit Request'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
