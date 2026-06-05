import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  useGetLevel, 
  useStartExam, 
  useSubmitExamAnswer, 
  useCompleteExam,
  getGetLevelQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, AlertTriangle, ArrowLeft, Trophy, Medal, Star, BookOpen, ChevronLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link, useParams, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Exam() {
  const { levelId, ruleId } = useParams<{ levelId: string; ruleId?: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  const { data: level, isLoading: loadingLevel } = useGetLevel(levelId || "", {
    query: { enabled: !!levelId, queryKey: getGetLevelQueryKey(levelId || "") }
  });
  
  const [examState, setExamState] = useState<"setup" | "playing" | "summary">("setup");
  const [session, setSession] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [examResult, setExamResult] = useState<any>(null);

  const startExam = useStartExam();
  const submitExamAnswer = useSubmitExamAnswer();
  const completeExam = useCompleteExam();

  const handleStart = async () => {
    if (!levelId || !user?.uid) return;
    
    try {
      const result = await startExam.mutateAsync({
        data: {
          userId: user.uid,
          levelId: levelId,
          ruleId: ruleId || undefined,
        }
      });
      setSession(result);
      setExamState("playing");
      setCurrentQuestionIndex(0);
      setAnswerResult(null);
      setSelectedAnswer("");
      setCorrectAnswers(0);
      setTotalXp(0);
    } catch (error) {
      console.error("Failed to start exam", error);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !session || !user?.uid) return;
    
    const currentQuestion = session.questions[currentQuestionIndex];
    
    try {
      const result = await submitExamAnswer.mutateAsync({
        sessionId: session.id,
        data: {
          userId: user.uid,
          questionId: currentQuestion.id,
          answerText: selectedAnswer
        }
      });
      
      setAnswerResult(result);
      if (result.correct) {
        setCorrectAnswers(prev => prev + 1);
      }
      setTotalXp(prev => prev + result.xpAwarded);
    } catch (error) {
      console.error("Failed to submit answer", error);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer("");
      setAnswerResult(null);
    } else {
      try {
        const finalCorrect = correctAnswers + (answerResult?.correct ? 1 : 0);
        const result = await completeExam.mutateAsync({
          sessionId: session.sessionId,
          data: {
            userId: user!.uid,
            levelId: levelId || "",
            ruleId: session.ruleId || ruleId || "",
            totalCorrect: finalCorrect,
            totalQuestions: session.questions.length
          }
        });
        setExamResult(result);
        setExamState("summary");
      } catch (error) {
        console.error("Failed to complete exam", error);
      }
    }
  };

  if (loadingLevel) {
    return <div className="text-center py-12">جاري التحميل...</div>;
  }

  if (!level) {
    return <div className="text-center py-12">لم يتم العثور على المستوى</div>;
  }

  // ── Level Overview (no specific ruleId in URL) ──────────────────────────────
  if (!ruleId) {
    const levelRules: { id: string; title: string }[] = (level as any).rules || [];
    return (
      <div className="max-w-2xl mx-auto mt-8 space-y-4">
        <Link href="/">
          <Button variant="ghost" className="gap-2 mb-2">
            <ChevronLeft className="w-4 h-4" />
            العودة للرئيسية
          </Button>
        </Link>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-3 rounded-xl">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{level.title}</CardTitle>
                {(level as any).description && (
                  <p className="text-muted-foreground mt-1">{(level as any).description}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted p-3 rounded-lg flex justify-between">
                <span className="text-muted-foreground">نسبة النجاح</span>
                <span className="font-bold">{(level as any).passingScore}%</span>
              </div>
              <div className="bg-muted p-3 rounded-lg flex justify-between">
                <span className="text-muted-foreground">أسئلة / امتحان</span>
                <span className="font-bold">{(level as any).questionCount}</span>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium mb-3 text-muted-foreground">
                امتحانات هذا المستوى ({levelRules.length})
              </p>
              <div className="space-y-2">
                {levelRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد قواعد مضافة لهذا المستوى</p>
                ) : levelRules.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium">{rule.title}</p>
                        <p className="text-xs text-muted-foreground">{(level as any).questionCount} سؤال</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/exam/${levelId}/${rule.id}`)}
                    >
                      ابدأ الامتحان
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Get the current rule title from the level ──────────────────────────────
  const levelRules: { id: string; title: string }[] = (level as any).rules || [];
  const currentRule = levelRules.find(r => r.id === ruleId);
  const ruleTitle = currentRule?.title || (level as any).ruleTitle || "";

  // ── Exam Setup ──────────────────────────────────────────────────────────────
  if (examState === "setup") {
    return (
      <div className="max-w-2xl mx-auto mt-8 space-y-4">
        <Button variant="ghost" className="gap-2" onClick={() => navigate(`/exam/${levelId}`)}>
          <ChevronLeft className="w-4 h-4" />
          {level.title}
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">امتحان: {ruleTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {levelRules.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                {levelRules.map((r, idx) => (
                  <Badge
                    key={r.id}
                    variant={r.id === ruleId ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {idx + 1}. {r.title}
                  </Badge>
                ))}
              </div>
            )}
            <div className="bg-muted p-4 rounded-xl flex justify-between items-center">
              <span>نسبة النجاح المطلوبة:</span>
              <span className="font-bold text-lg">{(level as any).passingScore}%</span>
            </div>
            <div className="bg-muted p-4 rounded-xl flex justify-between items-center">
              <span>عدد الأسئلة:</span>
              <span className="font-bold text-lg">{(level as any).questionCount} أسئلة</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleStart} 
              disabled={startExam.isPending}
            >
              {startExam.isPending ? "جاري الإعداد..." : "بدء الامتحان"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Playing ─────────────────────────────────────────────────────────────────
  if (examState === "playing" && session) {
    const currentQuestion = session.questions[currentQuestionIndex];
    const progress = (currentQuestionIndex / session.questions.length) * 100;

    return (
      <div className="max-w-3xl mx-auto space-y-6 mt-4">
        <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>السؤال {currentQuestionIndex + 1} من {session.questions.length}</span>
          <span>{totalXp} نقطة</span>
        </div>
        <Progress value={progress} className="h-2" />

        <Card className="border-2">
          <CardHeader className="bg-muted/30 pb-6">
            <CardTitle className="text-xl leading-relaxed">{currentQuestion.questionText}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <RadioGroup 
              value={selectedAnswer} 
              onValueChange={setSelectedAnswer} 
              disabled={!!answerResult}
              className="space-y-3"
            >
              {currentQuestion.options.map((option: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value={option} id={`option-${idx}`} className="sr-only" />
                  <Label 
                    htmlFor={`option-${idx}`}
                    className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAnswer === option && !answerResult ? 'border-primary bg-primary/5' : 'border-transparent bg-muted hover:bg-muted/80'
                    } ${
                      answerResult && option === answerResult.correctAnswer ? 'border-green-500 bg-green-50 text-green-900' : ''
                    } ${
                      answerResult && selectedAnswer === option && !answerResult.correct ? 'border-red-500 bg-red-50 text-red-900' : ''
                    }`}
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {answerResult && (
              <div className="mt-6">
                {answerResult.correct ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-800 font-bold mr-2">إجابة صحيحة!</AlertTitle>
                    <AlertDescription className="text-green-700 mr-2">
                      حصلت على {answerResult.xpAwarded} نقطة
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertTitle className="text-red-800 font-bold mr-2">إجابة خاطئة</AlertTitle>
                    <AlertDescription className="text-red-700 mr-2 mt-2">
                      الإجابة الصحيحة هي: <span className="font-bold">{answerResult.correctAnswer}</span>
                      {answerResult.hint && (
                        <div className="mt-2 flex items-start gap-2 bg-white/50 p-3 rounded text-sm">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <span><strong>توضيح:</strong> {answerResult.hint}</span>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/20 border-t justify-end p-4">
            {!answerResult ? (
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={!selectedAnswer || submitExamAnswer.isPending}
                size="lg"
              >
                تأكيد الإجابة
              </Button>
            ) : (
              <Button 
                onClick={handleNextQuestion}
                disabled={completeExam.isPending}
                size="lg"
                className="gap-2"
              >
                {currentQuestionIndex < session.questions.length - 1 ? "السؤال التالي" : "إنهاء الامتحان"}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  if (examState === "summary" && examResult) {
    const isPassed = examResult.passed;
    const allDone = examResult.allRulesPassed;

    return (
      <div className="max-w-lg mx-auto mt-12 space-y-6">
        <Card className="text-center overflow-hidden border-2">
          <div className={`h-32 flex items-center justify-center ${isPassed ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
            {isPassed ? <Trophy className="w-16 h-16" /> : <AlertTriangle className="w-16 h-16" />}
          </div>
          <CardContent className="pt-8 pb-8 space-y-6">
            <div>
              <h2 className="text-3xl font-bold">{isPassed ? 'نجاح!' : 'لم تجتز الامتحان'}</h2>
              {ruleTitle && <p className="text-muted-foreground mt-1">{ruleTitle}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-xl">
                <p className="text-muted-foreground text-sm">النتيجة</p>
                <p className="text-2xl font-bold">{Math.round(examResult.score)}%</p>
              </div>
              <div className="bg-muted p-4 rounded-xl">
                <p className="text-muted-foreground text-sm">النقاط المكتسبة</p>
                <p className="text-2xl font-bold text-secondary">{examResult.xpEarned}</p>
              </div>
            </div>

            {examResult.badgeEarned && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex flex-col items-center justify-center gap-2">
                <Medal className="w-10 h-10 text-yellow-500" />
                <span className="font-bold text-lg">حصلت على وسام!</span>
                <p className="text-sm">لقد أتقنت هذه القاعدة النحوية بجدارة.</p>
              </div>
            )}

            {isPassed && allDone && examResult.nextLevelId && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center justify-center gap-3">
                <Star className="w-6 h-6 text-green-600" />
                <span className="font-bold text-lg">أتممت المستوى! ترقيت للمستوى التالي.</span>
              </div>
            )}

            {isPassed && !allDone && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm">
                أحسنت! أكمل باقي امتحانات المستوى للترقي.
              </div>
            )}
          </CardContent>
          <CardFooter className="flex gap-4 p-6 bg-muted/20">
            {!isPassed && (
              <Button variant="outline" className="flex-1" onClick={() => setExamState("setup")}>
                إعادة الامتحان
              </Button>
            )}
            {isPassed && levelRules.length > 1 && (
              <Button variant="outline" className="flex-1" onClick={() => navigate(`/exam/${levelId}`)}>
                باقي الامتحانات
              </Button>
            )}
            <Link href="/" className="flex-1">
              <Button className="w-full">الرئيسية</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null;
}
