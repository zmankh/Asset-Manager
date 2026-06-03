import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  useListGrammarRules, 
  useStartQuiz, 
  useSubmitAnswer, 
  useCompleteQuiz 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, AlertTriangle, ArrowLeft, Trophy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";

export default function Quiz() {
  const { user } = useAuth();
  const { data: rules, isLoading: loadingRules } = useListGrammarRules();
  
  const [selectedRule, setSelectedRule] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<string>("5");
  
  const [quizState, setQuizState] = useState<"setup" | "playing" | "summary">("setup");
  const [session, setSession] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [quizResult, setQuizResult] = useState<any>(null);

  const startQuiz = useStartQuiz();
  const submitAnswer = useSubmitAnswer();
  const completeQuiz = useCompleteQuiz();

  const handleStart = async () => {
    if (!selectedRule || !user?.uid) return;
    
    try {
      const result = await startQuiz.mutateAsync({
        data: {
          userId: user.uid,
          ruleId: selectedRule,
          questionCount: parseInt(questionCount)
        }
      });
      setSession(result);
      setQuizState("playing");
      setCurrentQuestionIndex(0);
      setAnswerResult(null);
      setSelectedAnswer("");
      setCorrectAnswers(0);
      setTotalXp(0);
    } catch (error) {
      console.error("Failed to start quiz", error);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !session || !user?.uid) return;
    
    const currentQuestion = session.questions[currentQuestionIndex];
    
    try {
      const result = await submitAnswer.mutateAsync({
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
      // Complete quiz
      try {
        const result = await completeQuiz.mutateAsync({
          data: {
            userId: user!.uid,
            totalCorrect: correctAnswers + (answerResult?.correct ? 1 : 0),
            totalQuestions: session.questions.length
          }
        });
        setQuizResult(result);
        setQuizState("summary");
      } catch (error) {
        console.error("Failed to complete quiz", error);
      }
    }
  };

  if (loadingRules) {
    return <div className="text-center py-12">جاري التحميل...</div>;
  }

  if (quizState === "setup") {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">بدء اختبار جديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>اختر القاعدة النحوية</Label>
              <Select value={selectedRule} onValueChange={setSelectedRule}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر قاعدة..." />
                </SelectTrigger>
                <SelectContent>
                  {rules?.map(rule => (
                    <SelectItem key={rule.id} value={rule.id}>{rule.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>عدد الأسئلة</Label>
              <Select value={questionCount} onValueChange={setQuestionCount}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العدد..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 أسئلة</SelectItem>
                  <SelectItem value="10">10 أسئلة</SelectItem>
                  <SelectItem value="15">15 سؤال</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleStart} 
              disabled={!selectedRule || startQuiz.isPending}
            >
              {startQuiz.isPending ? "جاري الإعداد..." : "بدء الاختبار"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (quizState === "playing" && session) {
    const currentQuestion = session.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / session.questions.length) * 100;

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
                disabled={!selectedAnswer || submitAnswer.isPending}
                size="lg"
              >
                تأكيد الإجابة
              </Button>
            ) : (
              <Button 
                onClick={handleNextQuestion}
                disabled={completeQuiz.isPending}
                size="lg"
                className="gap-2"
              >
                {currentQuestionIndex < session.questions.length - 1 ? "السؤال التالي" : "إنهاء الاختبار"}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (quizState === "summary" && quizResult) {
    const isPassed = quizResult.passed;

    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="text-center overflow-hidden border-2">
          <div className={`h-32 flex items-center justify-center ${isPassed ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
            {isPassed ? <Trophy className="w-16 h-16" /> : <AlertTriangle className="w-16 h-16" />}
          </div>
          <CardContent className="pt-8 pb-8 space-y-6">
            <h2 className="text-3xl font-bold">{isPassed ? 'أحسنت صنعاً!' : 'حاول مرة أخرى'}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-xl">
                <p className="text-muted-foreground text-sm">النتيجة</p>
                <p className="text-2xl font-bold">{Math.round(quizResult.score * 100)}%</p>
              </div>
              <div className="bg-muted p-4 rounded-xl">
                <p className="text-muted-foreground text-sm">النقاط المكتسبة</p>
                <p className="text-2xl font-bold text-secondary">{quizResult.xpEarned}</p>
              </div>
            </div>

            {quizResult.newStreak && (
              <div className="bg-orange-50 border border-orange-100 text-orange-800 p-3 rounded-lg flex items-center justify-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-bold">سلسلة استمرارية جديدة: {quizResult.newStreak} أيام!</span>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex gap-4 p-6 bg-muted/20">
            <Button variant="outline" className="flex-1" onClick={() => setQuizState("setup")}>
              اختبار جديد
            </Button>
            <Link href="/" className="flex-1">
              <Button className="w-full">العودة للرئيسية</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null;
}

// Add this so it compiles if Flame is missing
import { Flame } from "lucide-react";