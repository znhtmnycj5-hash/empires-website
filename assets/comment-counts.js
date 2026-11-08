(function(){
  const safeArray=value=>Array.isArray(value)?value:[];
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch(e){return fallback;}};
  const getBattleCommentCount=id=>{
    if(!id)return 0;
    const saved=safeArray(read('empire-battle-comments-'+id,[]));
    return saved.length+(id==='battle-001'?10:0);
  };
  const getNewsCommentCount=id=>{
    if(!id)return 0;
    const map=read('empire_news_comments_v1',{});
    return safeArray(map&&map[id]).length;
  };
  const badge=(count,href)=>'<a class="preview-comment-count" href="'+href+'" aria-label="Комментарии: '+count+'"><span class=\"preview-comment-icon\" aria-hidden=\"true\">💬</span> <span>'+count+'</span></a>';
  window.EMPIRE_COMMENT_COUNTS={getBattleCommentCount,getNewsCommentCount,badge};
})();