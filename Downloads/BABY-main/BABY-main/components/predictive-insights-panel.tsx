'use client'

import { useState, useEffect } from 'react'
import {
  Brain,
  AlertTriangle,
  Zap,
  RefreshCw,
  CheckCircle,
  TrendingUp,
  Code,
  Shield,
  Gauge,
  Eye,
  Wrench,
  Package,
  Lightbulb,
} from 'lucide-react'

interface CodeSmell {
  type:
    | 'performance'
    | 'security'
    | 'maintainability'
    | 'accessibility'
    | 'best-practice'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location: { file: string; line?: number }
  suggestion: string
  autoFixAvailable: boolean
  estimatedImpact: string
}

interface RefactoringOpportunity {
  type: string
  description: string
  beforeCode: string
  afterCode: string
  benefits: string[]
  effort: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  file: string
}

interface DependencyAlert {
  package: string
  currentVersion: string
  latestVersion: string
  securityVulnerabilities: number
  recommendation: string
  autoUpgradeAvailable: boolean
}

interface PredictiveInsight {
  id: string
  type:
    | 'behavior-pattern'
    | 'code-improvement'
    | 'dependency-update'
    | 'performance-optimization'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description: string
  actionable: boolean
  estimatedTimeToImplement: string
  potentialBenefit: string
  timestamp: string
}

interface AnalysisResult {
  codeSmells: CodeSmell[]
  refactoringOpportunities: RefactoringOpportunity[]
  dependencyAlerts: DependencyAlert[]
  predictiveInsights: PredictiveInsight[]
  autoFixes: Record<string, string>
}

interface PredictiveInsightsPanelProps {
  codeFiles: Record<string, string>
  projectType: string
  userId?: string
  onApplyFix?: (filePath: string, fixedCode: string) => void
}

export default function PredictiveInsightsPanel({
  codeFiles,
  projectType,
  userId,
  onApplyFix,
}: PredictiveInsightsPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedTab, setSelectedTab] = useState<
    'smells' | 'refactoring' | 'dependencies' | 'insights'
  >('insights')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (Object.keys(codeFiles).length > 0) {
      analyzeCode()
    }
  }, [codeFiles, projectType])

  const analyzeCode = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/predictive/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeFiles,
          projectType,
          userId,
          action: 'code-analysis',
        }),
      })

      const result = await response.json()
      if (result.success) {
        setAnalysis(result.analysis)
      }
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applyAutoFix = async (smell: CodeSmell) => {
    try {
      const filePath = smell.location.file
      const originalCode = codeFiles[filePath]

      const response = await fetch('/api/predictive/autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: originalCode,
          smells: [smell],
          filePath,
        }),
      })

      const result = await response.json()
      if (result.success && onApplyFix) {
        onApplyFix(filePath, result.fixedCode)
      }
    } catch (error) {
      console.error('Auto-fix failed:', error)
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-900/20 border-red-500/30'
      case 'high':
        return 'text-orange-400 bg-orange-900/20 border-orange-500/30'
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'
      case 'low':
        return 'text-blue-400 bg-blue-900/20 border-blue-500/30'
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-500/30'
    }
  }

  const getPriorityColor = (priority: string) => {
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return <Gauge className="w-4 h-4" />
      case 'security':
        return <Shield className="w-4 h-4" />
      case 'maintainability':
        return <Code className="w-4 h-4" />
      case 'accessibility':
        return <Eye className="w-4 h-4" />
      case 'best-practice':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  if (isAnalyzing) {
    return (
      <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-green-400 animate-pulse" />
          <h3 className="text-lg font-semibold text-green-400">
            AI Code Analysis
          </h3>
        </div>
        <div className="flex items-center gap-2 text-green-500/70">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Analyzing code patterns and generating insights...</span>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-green-400" />
          <h3 className="text-lg font-semibold text-green-400">
            AI Code Analysis
          </h3>
        </div>
        <p className="text-green-500/70">
          Generate code to see predictive insights and suggestions.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 border border-green-500/30 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-semibold text-green-400">
              Predictive Code Evolution
            </h3>
          </div>
          <button
            onClick={analyzeCode}
            className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-3 py-1 rounded text-sm transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Re-analyze
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
            <div className="text-red-400 text-sm font-semibold">
              Critical Issues
            </div>
            <div className="text-red-300 text-xl font-bold">
              {
                analysis.codeSmells.filter((s) => s.severity === 'critical')
                  .length
              }
            </div>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
            <div className="text-blue-400 text-sm font-semibold">
              Refactoring Ops
            </div>
            <div className="text-blue-300 text-xl font-bold">
              {analysis.refactoringOpportunities.length}
            </div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3">
            <div className="text-yellow-400 text-sm font-semibold">
              Dependency Alerts
            </div>
            <div className="text-yellow-300 text-xl font-bold">
              {analysis.dependencyAlerts.length}
            </div>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
            <div className="text-purple-400 text-sm font-semibold">
              AI Insights
            </div>
            <div className="text-purple-300 text-xl font-bold">
              {analysis.predictiveInsights.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-green-500/30">
        {[
          {
            id: 'insights',
            label: 'AI Insights',
            icon: <Lightbulb className="w-4 h-4" />,
          },
          {
            id: 'smells',
            label: 'Code Smells',
            icon: <AlertTriangle className="w-4 h-4" />,
          },
          {
            id: 'refactoring',
            label: 'Refactoring',
            icon: <Wrench className="w-4 h-4" />,
          },
          {
            id: 'dependencies',
            label: 'Dependencies',
            icon: <Package className="w-4 h-4" />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
              selectedTab === tab.id
                ? 'text-green-400 border-b-2 border-green-400 bg-green-500/10'
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
        {selectedTab === 'insights' && (
          <div className="space-y-3">
            {analysis.predictiveInsights.length === 0 ? (
              <p className="text-green-500/70 text-center py-8">
                No insights available yet. Keep coding to generate AI insights!
              </p>
            ) : (
              analysis.predictiveInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`border rounded-lg p-3 ${getPriorityColor(insight.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold text-sm">
                          {insight.title}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(insight.priority)}`}
                        >
                          {insight.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm opacity-90 mb-2">
                        {insight.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs opacity-70">
                        <span>⏱️ {insight.estimatedTimeToImplement}</span>
                        <span>💡 {insight.potentialBenefit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {selectedTab === 'smells' && (
          <div className="space-y-3">
            {analysis.codeSmells.length === 0 ? (
              <p className="text-green-500/70 text-center py-8">
                No code smells detected. Great job! 🎉
              </p>
            ) : (
              analysis.codeSmells.map((smell, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-3 ${getSeverityColor(smell.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(smell.type)}
                        <span className="font-semibold text-sm">
                          {smell.description}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(smell.severity)}`}
                        >
                          {smell.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs opacity-70 mb-2">
                        📁 {smell.location.file}
                      </p>
                      <p className="text-sm opacity-90 mb-2">
                        {smell.suggestion}
                      </p>
                      <p className="text-xs opacity-70">
                        💪 {smell.estimatedImpact}
                      </p>
                    </div>
                    {smell.autoFixAvailable && (
                      <button
                        onClick={() => applyAutoFix(smell)}
                        className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-3 py-1 rounded text-xs transition-colors"
                      >
                        <Zap className="w-3 h-3 inline mr-1" />
                        Auto-fix
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {selectedTab === 'refactoring' && (
          <div className="space-y-3">
            {analysis.refactoringOpportunities.length === 0 ? (
              <p className="text-green-500/70 text-center py-8">
                No refactoring opportunities found.
              </p>
            ) : (
              analysis.refactoringOpportunities.map((opportunity, index) => (
                <div
                  key={index}
                  className="border border-blue-500/30 rounded-lg p-3 bg-blue-900/20"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className="w-4 h-4 text-blue-400" />
                        <span className="font-semibold text-sm text-blue-400">
                          {opportunity.description}
                        </span>
                      </div>
                      <p className="text-xs text-blue-300/70 mb-2">
                        📁 {opportunity.file}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleExpanded(`refactor-${index}`)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {expandedItems.has(`refactor-${index}`) ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedItems.has(`refactor-${index}`) && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-blue-500/20">
                      <div>
                        <h5 className="text-xs font-semibold text-blue-400 mb-1">
                          Benefits:
                        </h5>
                        <ul className="text-xs text-blue-300/90 space-y-1">
                          {opportunity.benefits.map((benefit, i) => (
                            <li key={i}>• {benefit}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <h5 className="text-xs font-semibold text-blue-400 mb-1">
                            Before:
                          </h5>
                          <pre className="text-xs bg-gray-800/50 p-2 rounded overflow-x-auto">
                            {opportunity.beforeCode}
                          </pre>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-blue-400 mb-1">
                            After:
                          </h5>
                          <pre className="text-xs bg-gray-800/50 p-2 rounded overflow-x-auto">
                            {opportunity.afterCode}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {selectedTab === 'dependencies' && (
          <div className="space-y-3">
            {analysis.dependencyAlerts.length === 0 ? (
              <p className="text-green-500/70 text-center py-8">
                All dependencies are up to date! 🚀
              </p>
            ) : (
              analysis.dependencyAlerts.map((alert, index) => (
                <div
                  key={index}
                  className="border border-yellow-500/30 rounded-lg p-3 bg-yellow-900/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-yellow-400" />
                        <span className="font-semibold text-sm text-yellow-400">
                          {alert.package}
                        </span>
                        <span className="text-xs text-yellow-300/70">
                          {alert.currentVersion} → {alert.latestVersion}
                        </span>
                      </div>
                      {alert.securityVulnerabilities > 0 && (
                        <div className="text-xs text-red-400 mb-1">
                          🚨 {alert.securityVulnerabilities} security
                          vulnerabilities
                        </div>
                      )}
                      <p className="text-sm text-yellow-300/90 mb-2">
                        {alert.recommendation}
                      </p>
                    </div>
                    {alert.autoUpgradeAvailable && (
                      <button className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400 px-3 py-1 rounded text-xs transition-colors">
                        Auto-upgrade
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
