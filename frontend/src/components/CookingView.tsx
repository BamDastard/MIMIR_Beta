import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, ArrowLeft, ArrowRight } from 'lucide-react';

interface Recipe {
    title: string;
    ingredients: string[];
    steps: string[];
}

interface CookingViewProps {
    recipe: Recipe | null;
    currentStep: number;
    setCurrentStep: (step: number) => void;
    cookingMode: boolean;
}

export default function CookingView({
    recipe,
    currentStep,
    setCurrentStep,
    cookingMode
}: CookingViewProps) {
    return (
        <AnimatePresence>
            {cookingMode && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="w-full md:w-2/3 glass-panel rounded-2xl p-4 md:p-6 flex flex-col h-full shrink-0 pb-24 md:pb-6"
                >
                    {recipe ? (
                        <>
                            {/* Header */}
                            <div className="mb-4 border-b border-white/10 pb-4 text-center shrink-0">
                                <h2 className="text-xl md:text-2xl font-cinzel text-primary-glow truncate px-2">{recipe.title}</h2>
                            </div>

                            {/* Ingredients Section - Collapsible/Scrollable on Mobile */}
                            <div className="h-1/4 md:h-1/3 flex flex-col mb-4 shrink-0">
                                <div className="flex items-center justify-between mb-2 md:mb-3">
                                    <h3 className="text-base md:text-lg font-medium text-primary flex items-center gap-2">
                                        <div className="w-1 h-1 bg-primary rounded-full" /> Ingredients
                                    </h3>
                                    <span className="text-xs text-white/40 font-mono">{recipe.ingredients?.length || 0} items</span>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-black/20 rounded-lg p-2">
                                    <div className="grid grid-cols-1 gap-2">
                                        {recipe.ingredients?.map((ing, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-foreground/80 p-2 rounded-lg bg-white/5">
                                                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full shrink-0" />
                                                <span className="leading-tight">{ing}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Current Step Section - Takes remaining space */}
                            <div className="flex-1 flex flex-col bg-black/20 rounded-xl overflow-hidden min-h-0">
                                {/* Progress Bar */}
                                <div className="w-full h-1 bg-white/5 shrink-0">
                                    <motion.div
                                        className="h-full bg-primary"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((currentStep + 1) / (recipe.steps?.length || 1)) * 100}%` }}
                                    />
                                </div>

                                {/* Step Content */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentStep}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="w-full text-center"
                                        >
                                            <p className="text-lg md:text-3xl font-light leading-relaxed text-white">
                                                {recipe.steps?.[currentStep] || "No step details available."}
                                            </p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center justify-between p-4 border-t border-white/5 bg-black/20 shrink-0">
                                    <button
                                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                        disabled={currentStep === 0}
                                        className="flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm md:text-base"
                                    >
                                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden md:inline">Previous</span>
                                    </button>
                                    <span className="font-mono text-xs md:text-sm text-white/40">
                                        Step {currentStep + 1} / {recipe.steps?.length || 0}
                                    </span>
                                    <button
                                        onClick={() => setCurrentStep(Math.min((recipe.steps?.length || 1) - 1, currentStep + 1))}
                                        disabled={currentStep === (recipe.steps?.length || 1) - 1}
                                        className="flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary-glow disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm md:text-base"
                                    >
                                        <span className="hidden md:inline">Next</span> <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-foreground/40">
                            <ChefHat className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg">No recipe loaded.</p>
                            <p className="text-sm mt-2">Ask MIMIR to find a recipe or start cooking.</p>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
