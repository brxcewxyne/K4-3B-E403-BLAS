export const OUT_OF_SCOPE_EN = "I'm only able to help with the current lab and its provided materials.";
export const OUT_OF_SCOPE_VI = "Mình chỉ hỗ trợ các câu hỏi liên quan đến bài lab hiện tại và tài liệu đã được cung cấp.";

export type ScopeContext = {
  labTitle?: string;
  fileNames: string[];
  headings: string[];
  stepTitles: string[];
};

const STOPWORDS = new Set(
  "what,how,why,when,where,which,who,whom,whose,that,this,these,those,with,from,about,into,does,doing,should,would,could,can,will,the,and,for,are,was,were,been,have,has,had,will,just,like,than,then,there,their,them,they,you,your,me,my,we,our,it,its,as,at,by,an,of,on,in,is,to,do,did,be,am,are,or,not,no,yes,if,but,all,any,each,more,most,other,some,such,only,own,same,too,very,now,a,an,i,mot,cai,cac,nhung,la,va,hoac,cua,trong,voi,nhu,the,nao,gi,do,nay,kia,khi,neu,thi,ma,co,khong,duoc,cho,toi,ban,minh,chung,ho,no,da,dang,se,rat,cung,van,lai,con,hon,nhat,moi,moi,mot,it,nhieu,tat,ca,hay,di,lam,sao,dau,nao,vay,the,nhe,nha,a,oi".split(",")
);

// Generic lab-workflow vocabulary: keeps workflow questions in scope even
// when the exact lab terms are absent. Deliberately free of general-world topics.
const GENERIC_LAB_TOKENS = new Set(
  "lab,step,checkpoint,setup,install,run,error,requirement,requirements,deliverable,evaluation,workflow,guide,task,procedure,command,config,configuration,test,success,warning,source,material,materials,goal,prerequisite,output,submit,submission,example,exercise,lesson,tutorial,practice,bai,tai,lieu,buoc,thuc,hanh,huong,dan,loi,chay,cai,dat,yeu,cau,nop,danh,gia".split(",")
);

const ALLOW_PATTERNS = [
  /what should i do/i,
  /how do i\b/i,
  /\bcheckpoint\b/i,
  /\berror\b/i,
  /\bstep\b/i,
  /\bnext\b/i,
  /what (do|is|are) (the |my |this )?(next|required|needed)/i,
  /what does .* mean/i,
  /how (to|do).*(run|install|setup|configure|start)/i,
  /làm (thế|sao|gì|như).*(tiếp|theo|bước)/i,
  /\bbước\b/i,
  /\blỗi\b/i
];

// Clearly non-lab topics. Only deny when NOTHING overlaps lab vocabulary,
// so a weather-data lab still answers weather questions about its own data.
const DENY_PATTERNS = [
  /\bwho (is|was|are|were)\b/i,
  /\bpresident\b/i,
  /\bweather\b/i,
  /\bpoem\b|\bpoetry\b/i,
  /\brecipe\b|\bcook\b|\bcooking\b/i,
  /\bcapital of\b/i,
  /\bmovie\b|\bsong\b|\bfootball\b|\bbirthday\b/i,
  /\belection\b|\bstock price\b|\blottery\b/i,
  /thời tiết/i,
  /làm thơ/i,
  /nấu ăn/i,
  /công thức nấu/i,
  /tổng thống/i,
  /thủ đô/i,
  /\bai là\b/i
];

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9_À-ỹ]+/u)
    .map((token) => token.normalize("NFC"))
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function labVocabulary(context: ScopeContext): Set<string> {
  const vocab = new Set<string>(GENERIC_LAB_TOKENS);
  const feed = (value: string | undefined) => {
    if (!value) return;
    for (const token of tokenize(value.replace(/\.(md|mdx|txt)$/i, "").replace(/[/_.-]+/g, " "))) {
      vocab.add(token);
    }
  };
  feed(context.labTitle);
  for (const name of context.fileNames) feed(name);
  for (const heading of context.headings) feed(heading);
  for (const title of context.stepTitles) feed(title);
  return vocab;
}

export type ScopeVerdict = { inScope: boolean; reason: "vocab-overlap" | "workflow-intent" | "out-of-scope-pattern" | "ambiguous-allow" };

/**
 * Deterministic lab-scope guard (no LLM call). Ambiguous questions default
 * to allowed — the grounded model plus its not-enough-information fallback
 * handles the rest without false-rejecting legitimate lab questions.
 */
export function checkLabScope(question: string, context: ScopeContext): ScopeVerdict {
  const tokens = tokenize(question);
  const vocab = labVocabulary(context);
  if (tokens.some((token) => vocab.has(token))) return { inScope: true, reason: "vocab-overlap" };
  if (ALLOW_PATTERNS.some((pattern) => pattern.test(question))) return { inScope: true, reason: "workflow-intent" };
  if (DENY_PATTERNS.some((pattern) => pattern.test(question))) return { inScope: false, reason: "out-of-scope-pattern" };
  return { inScope: true, reason: "ambiguous-allow" };
}

const VIETNAMESE_HINT = /[\u00C0-\u1EF9]|mình|bài lab|tài liệu|hiện tại|thế nào|làm sao/i;

/** Match the canned refusal to the question language (Vietnamese diacritics or markers → vi). */
export function outOfScopeResponse(question: string): string {
  return VIETNAMESE_HINT.test(question) ? OUT_OF_SCOPE_VI : OUT_OF_SCOPE_EN;
}
