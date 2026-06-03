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
import { AlertCircle, CheckCircle2, AlertTriangle, ArrowLeft, Trophy, Medal, Star } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link, useParams } from "wouter";

export default function Exam() {
  const { levelId } = useParams<{ levelId: string }>();
  const { user } = useAuth();
  
  // Wait for levelId and user
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
          levelId: levelId
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
      // Complete exam
      try {
        const result = await completeExam.mutateAsync({
          sessionId: session.sessionId,
          data: {
            userId: user!.uid,
            levelId: levelId || "",
            totalCorrect: correctAnswers + (answerResult?.correct ? 1 : 0),
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

  if (examState === "setup") {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">امتحان المستوى: {level.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground text-lg">
              هذا الامتحان سيختبر مدى فهمك لقاعدة "{level.ruleTitle || level.title}".
            </p>
            <div className="bg-muted p-4 rounded-xl flex justify-between items-center">
              <span>نسبة النجاح المطلوبة:</span>
              <span className="font-bold text-lg">{level.passingScore}%</span>
            </div>
            <div className="bg-muted p-4 rounded-xl flex justify-between items-center">
              <span>عدد الأسئلة:</span>
              <span className="font-bold text-lg">{level.questionCount} أسئلة</span>
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

  if (examState === "playing" && session) {
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

  if (examState === "summary" && examResult) {
    const isPassed = examResult.passed;

    return (
      <div className="max-w-lg mx-auto mt-12 space-y-6">
        <Card className="text-center overflow-hidden border-2">
          <div className={`h-32 flex items-center justify-center ${isPassed ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
            {isPassed ? <Trophy className="w-16 h-16" /> : <AlertTriangle className="w-16 h-16" />}
          </div>
          <CardContent className="pt-8 pb-8 space-y-6">
            <h2 className="text-3xl font-bold">{isPassed ? 'نجاح!' : 'لم تجتز الامتحان'}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-xl">
                <p className="text-muted-foreground text-sm">النتيجة</p>
                <p className="text-2xl font-bold">{Math.round(examResult.score * 100)}%</p>
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
            
            {isPassed && examResult.nextLevelId && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center justify-center gap-3">
                <Star className="w-6 h-6 text-green-600" />
                <span className="font-bold text-lg">ترقيت للمستوى التالي!</span>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex gap-4 p-6 bg-muted/20">
            {!isPassed && (
              <Button variant="outline" className="flex-1" onClick={() => setExamState("setup")}>
                إعادة الامتحان
              </Button>
            )}
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
