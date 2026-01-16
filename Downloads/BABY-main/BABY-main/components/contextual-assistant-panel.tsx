'use client'

import { useState, useEffect } from 'react'
import {
  Brain,
  Lightbulb,
  Target,
  Shield,
  Zap,
  Users,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Sparkles,
} from 'lucide-react'
import {
  contextualAssistant,
  type ProactiveSuggestion,
  type ProjectContext,
} from '@/lib/contextual-assistant'

interface ContextualAssistantPanelProps {
  userId: string
  projectId: string
  currentCode?: Record<string, string>
  onApplySuggestion?: (suggestion: ProactiveSuggestion) => void
  onUpdateContext?: (updates: Partial<ProjectContext>) => void
}

export default function ContextualAssistantPanel({
  userId,
  projectId,
  currentCode,
  onApplySuggestion,
  onUpdateContext,
}: ContextualAssistantPanelProps) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([])
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState<
    'suggestions' | 'context' | 'insights'
  >('suggestions')
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(
    null
  )

  useEffect(() => {
    loadProjectContext()
    generateSuggestions()
  }, [userId, projectId, currentCode])

  const loadProjectContext = async () => {
    try {
      const context = await contextualAssistant.getProjectContext(
        userId,
        projectId
      )
      setProjectContext(context)
    } catch (error) {
      console.error('Failed to load project context:', error)
    }
  }

  const generateSuggestions = async () => {
    setIsLoading(true)
    try {
      const newSuggestions =
        await contextualAssistant.generateProactiveSuggestions(
          userId,
          projectId,
          currentCode
        )
      setSuggestions(newSuggestions)
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionAction = async (
    suggestion: ProactiveSuggestion,
    action: 'accept' | 'reject'
  ) => {
    try {
      // Update suggestion status
      const updatedSuggestions = suggestions.map((s) =>
        s.id === suggestion.id
          ? { ...s, status: action === 'accept' ? 'accepted' : 'rejected' }
          : s
      )
      setSuggestions(updatedSuggestions)

      if (action === 'accept' && onApplySuggestion) {
        onApplySuggestion(suggestion)
      }
    } catch (error) {
      console.error('Failed to handle suggestion action:', error)
    }
  }

  const getSuggestionIcon = (type: ProactiveSuggestion['type']) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="w-4 h-4" />
      case 'optimization':
        return <Zap className="w-4 h-4" />
      case 'security':
        return <Shield className="w-4 h-4" />
      case 'ux':
        return <Users className="w-4 h-4" />
      case 'performance':
        return <TrendingUp className="w-4 h-4" />
      case 'learning':
        return <BookOpen className="w-4 h-4" />
      default:
        return <Lightbulb className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: ProactiveSuggestion['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400 bg-red-900/20 border-red-500/30'
      case 'high':
        return 'text-orange-400 bg-orange-900/20 border-orange-500/30'
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'
      case 'low':
        return 'text-green-400 bg-green-900/20 border-green-500/30'
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-500/30'
    }
  }

  const getTypeColor = (type: ProactiveSuggestion['type']) => {
    switch (type) {
      case 'feature':
        return 'text-purple-400'
      case 'optimization':
        return 'text-blue-400'
      case 'security':
        return 'text-red-400'
      case 'ux':
        return 'text-green-400'
      case 'performance':
        return 'text-yellow-400'
      case 'learning':
        return 'text-indigo-400'
      default:
        return 'text-gray-400'
    }
  }

  if (!projectContext) {
    return (
      <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-purple-400" />
          <h3 className="text-lg font-semibold text-green-400">
            Contextual AI Assistant
          </h3>
        </div>
        <p className="text-green-500/70">Loading project context...</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 border border-green-500/30 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-green-400">
              AI Assistant
            </h3>
          </div>
          <button
            onClick={generateSuggestions}
            disabled={isLoading}
            className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400 px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {/* Project Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
            <div className="text-purple-400 text-sm font-semibold">Project</div>
            <div className="text-purple-300 text-lg font-bold">
              {projectContext.name}
            </div>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
            <div className="text-blue-400 text-sm font-semibold">Phase</div>
            <div className="text-blue-300 text-lg font-bold capitalize">
              {projectContext.currentPhase}
            </div>
          </div>
          <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
            <div className="text-green-400 text-sm font-semibold">Features</div>
            <div className="text-green-300 text-lg font-bold">
              {projectContext.features.length}
            </div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3">
            <div className="text-yellow-400 text-sm font-semibold">
              Suggestions
            </div>
            <div className="text-yellow-300 text-lg font-bold">
              {suggestions.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-green-500/30">
        {[
          {
            id: 'suggestions',
            label: 'AI Suggestions',
            icon: <Lightbulb className="w-4 h-4" />,
          },
          {
            id: 'context',
            label: 'Project Context',
            icon: <Target className="w-4 h-4" />,
          },
          {
            id: 'insights',
            label: 'Smart Insights',
            icon: <Brain className="w-4 h-4" />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
              selectedTab === tab.id
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-green-500/70 hover:text-green-400'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {selectedTab === 'suggestions' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <Brain className="w-8 h-8 text-purple-400 animate-pulse mx-auto mb-2" />
                <p className="text-purple-400">Generating AI suggestions...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="w-8 h-8 text-green-500/50 mx-auto mb-2" />
                <p className="text-green-500/70">
                  No suggestions available yet.
                </p>
                <p className="text-green-500/50 text-sm">
                  Keep coding to get AI insights!
                </p>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`border rounded-lg p-3 transition-all ${
                    suggestion.status === 'accepted'
                      ? 'bg-green-900/20 border-green-500/30'
                      : suggestion.status === 'rejected'
                        ? 'bg-gray-900/20 border-gray-500/30 opacity-50'
                        : 'bg-gray-800/50 border-green-500/20 hover:border-green-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={getTypeColor(suggestion.type)}>
                          {getSuggestionIcon(suggestion.type)}
                        </span>
                        <span className="font-semibold text-sm text-green-400">
                          {suggestion.title}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(suggestion.priority)}`}
                        >
                          {suggestion.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-green-500/70">
                          ⏱️ {suggestion.estimatedTime}
                        </span>
                      </div>

                      <p className="text-sm text-green-300/90 mb-2">
                        {suggestion.description}
                      </p>

                      {expandedSuggestion === suggestion.id && (
                        <div className="space-y-3 mt-3 pt-3 border-t border-green-500/20">
                          <div>
                            <h5 className="text-xs font-semibold text-green-400 mb-1">
                              Reasoning:
                            </h5>
                            <p className="text-xs text-green-300/80">
                              {suggestion.reasoning}
                            </p>
                          </div>

                          <div>
                            <h5 className="text-xs font-semibold text-green-400 mb-1">
                              Implementation:
                            </h5>
                            <p className="text-xs text-green-300/80">
                              {suggestion.implementation}
                            </p>
                          </div>

                          {suggestion.benefits.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-green-400 mb-1">
                                Benefits:
                              </h5>
                              <ul className="text-xs text-green-300/80 space-y-1">
                                {suggestion.benefits.map((benefit, i) => (
                                  <li key={i}>• {benefit}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {suggestion.codeExample && (
                            <div>
                              <h5 className="text-xs font-semibold text-green-400 mb-1">
                                Code Example:
                              </h5>
                              <pre className="text-xs bg-gray-900/50 p-2 rounded overflow-x-auto text-green-300">
                                {suggestion.codeExample}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() =>
                          setExpandedSuggestion(
                            expandedSuggestion === suggestion.id
                              ? null
                              : suggestion.id
                          )
                        }
                        className="text-green-400 hover:text-green-300 transition-colors"
                      >
                        {expandedSuggestion === suggestion.id ? '▼' : '▶'}
                      </button>

                      {suggestion.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              handleSuggestionAction(suggestion, 'accept')
                            }
                            className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-2 py-1 rounded text-xs transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() =>
                              handleSuggestionAction(suggestion, 'reject')
                            }
                            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 px-2 py-1 rounded text-xs transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {suggestion.status === 'accepted' && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {selectedTab === 'context' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-green-500/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-400 mb-3">
                Project Goals
              </h4>
              {projectContext.goals.length > 0 ? (
                <ul className="space-y-1">
                  {projectContext.goals.map((goal, i) => (
                    <li
                      key={i}
                      className="text-sm text-green-300/90 flex items-center gap-2"
                    >
                      <Target className="w-3 h-3 text-green-500" />
                      {goal}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-green-500/70 text-sm">
                  No goals defined yet.
                </p>
              )}
            </div>

            <div className="bg-gray-800/50 border border-green-500/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-400 mb-3">
                Tech Stack
              </h4>
              <div className="flex flex-wrap gap-2">
                {projectContext.techStack.map((tech, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/50 border border-green-500/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-400 mb-3">
                Coding Style
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-green-500">Indentation:</span>
                  <span className="text-green-300 ml-2">
                    {projectContext.codeStyle.indentation}
                  </span>
                </div>
                <div>
                  <span className="text-green-500">Quotes:</span>
                  <span className="text-green-300 ml-2">
                    {projectContext.codeStyle.quotes}
                  </span>
                </div>
                <div>
                  <span className="text-green-500">CSS Framework:</span>
                  <span className="text-green-300 ml-2">
                    {projectContext.codeStyle.cssFramework}
                  </span>
                </div>
                <div>
                  <span className="text-green-500">State Management:</span>
                  <span className="text-green-300 ml-2">
                    {projectContext.codeStyle.stateManagement}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'insights' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-purple-400" />
                <h4 className="text-sm font-semibold text-purple-400">
                  AI Project Analysis
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-green-300/90">
                  Your project is in the{' '}
                  <strong>{projectContext.currentPhase}</strong> phase with{' '}
                  <strong>{projectContext.features.length}</strong> features
                  planned.
                </p>
                <p className="text-green-300/90">
                  Based on your {projectContext.type} project using{' '}
                  {projectContext.framework}, I recommend focusing on{' '}
                  {suggestions.filter((s) => s.priority === 'high').length > 0
                    ? 'high-priority suggestions'
                    : 'feature development'}
                  .
                </p>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-green-500/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-400 mb-3">
                Smart Recommendations
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-400">
                      Performance Focus
                    </p>
                    <p className="text-xs text-green-300/80">
                      Consider implementing lazy loading and code splitting for
                      better performance.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-400">
                      Security Review
                    </p>
                    <p className="text-xs text-green-300/80">
                      Add input validation and CSRF protection for production
                      readiness.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">
                      User Experience
                    </p>
                    <p className="text-xs text-green-300/80">
                      Consider adding loading states and error boundaries for
                      better UX.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
