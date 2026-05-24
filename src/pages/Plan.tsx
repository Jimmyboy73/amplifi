import { useState, useEffect } from 'react'
import type { PlanData } from './plan/types'
import { initialPlanData } from './plan/types'
import Phase1 from './plan/Phase1'
import Phase2 from './plan/Phase2'
import Phase3 from './plan/Phase3'

export default function Plan() {
  const [data, setData] = useState<PlanData>(initialPlanData)
  const [completedQuestions, setCompletedQuestions] = useState(0)

  const update = (updates: Partial<PlanData>) =>
    setData((prev) => ({ ...prev, ...updates }))

  const handleComplete = (questionIndex: number) => {
    setCompletedQuestions((prev) => Math.max(prev, questionIndex + 1))
  }

  // After Q5 completes, scroll to the save panel after the insight has time to animate in
  useEffect(() => {
    if (completedQuestions === 5) {
      const timer = setTimeout(() => {
        document.getElementById('phase3-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [completedQuestions])

  // Effective age: exact from DOB once Q1 done, else chip × 12
  const effectiveAgeMonths =
    completedQuestions > 0 ? data.childAgeMonths : data.ageChip * 12

  return (
    <div className="font-jakarta antialiased">
      <Phase1
        ageChip={data.ageChip}
        monthly={data.monthly}
        effectiveAgeMonths={effectiveAgeMonths}
        effectiveName={completedQuestions > 0 ? data.childName : ''}
        childAgeMonthsLocked={completedQuestions > 0}
        onAgeChange={(age) => update({ ageChip: age })}
        onMonthlyChange={(amount) => update({ monthly: amount })}
      />

      <Phase2
        data={{ ...data, childAgeMonths: effectiveAgeMonths }}
        completedQuestions={completedQuestions}
        onUpdate={update}
        onComplete={handleComplete}
      />

      {completedQuestions >= 5 && (
        <div id="phase3-section">
          <Phase3 data={data} />
        </div>
      )}
    </div>
  )
}
