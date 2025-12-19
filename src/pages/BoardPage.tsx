import React, { useState, useEffect } from 'react';
import { BoardService, Post, Comment } from '../services/boardService';
import { TRANSLATIONS, TEAMS } from '../constants';
import { MessageSquare, Send, User, Clock, PenTool, Eye, CheckCircle, X, MessageCircle } from 'lucide-react';

interface Props {
    lang: 'ko' | 'en';
}

const BoardPage: React.FC<Props> = ({ lang }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
    const [isLoading, setIsLoading] = useState(false);

    // Write Form State
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState(localStorage.getItem('f1_nickname') || 'Anonymous');
    const [targetTeam, setTargetTeam] = useState<string>('ALL');

    // Detail Modal State
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [commentContent, setCommentContent] = useState('');
    const [isCommentLoading, setIsCommentLoading] = useState(false);

    const fetchPosts = async (teamId: string) => {
        setIsLoading(true);
        const data = await BoardService.getPosts(teamId);
        setPosts(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPosts(selectedTeam);
    }, [selectedTeam]);

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setIsLoading(true);
        const newPost = await BoardService.createPost({
            title,
            content,
            author,
            teamId: targetTeam === 'ALL' ? undefined : targetTeam
        });

        if (newPost) {
            setPosts([newPost, ...posts]);
            setTitle('');
            setContent('');
            setIsFormVisible(false);
        }
        setIsLoading(false);
    };

    const openPostDetail = async (post: Post) => {
        // Optimistic UI update or wait for data
        const detailedPost = await BoardService.getPostById(post.id);
        if (detailedPost) {
            setSelectedPost(detailedPost);
            // Update the list item view count locally
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, views: detailedPost.views } : p));
        }
    };

    const handleCreateComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPost || !commentContent.trim()) return;

        setIsCommentLoading(true);
        const newComment = await BoardService.createComment({
            postId: selectedPost.id,
            content: commentContent,
            author
        });

        if (newComment) {
            setSelectedPost({
                ...selectedPost,
                comments: [...(selectedPost.comments || []), newComment]
            });
            setCommentContent('');
        }
        setIsCommentLoading(false);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 animate-fade-in pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                    <MessageSquare className="text-red-600" size={32} />
                    {lang === 'ko' ? '엔지니어링 게시판' : 'Engineering Board'}
                </h2>
                <button
                    onClick={() => {
                        setTargetTeam(selectedTeam); // 현재 선택된 팀을 글쓰기 폼의 기본값으로 설정
                        setIsFormVisible(!isFormVisible);
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-sm tracking-widest flex items-center gap-2 transition-all shadow-lg hover:shadow-red-900/50"
                >
                    <PenTool size={18} />
                    {lang === 'ko' ? '글쓰기' : 'Write Post'}
                </button>
            </div>

            {/* Team Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setSelectedTeam('ALL')}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all border ${selectedTeam === 'ALL'
                        ? 'bg-white text-black border-white'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                        }`}
                >
                    ALL TEAMS
                </button>
                {TEAMS.map(team => (
                    <button
                        key={team.id}
                        onClick={() => setSelectedTeam(team.id)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all border flex items-center gap-2 ${selectedTeam === team.id
                            ? 'bg-slate-800 text-white border-white scale-105 shadow-lg'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-team'
                            }`}
                        style={{ borderColor: selectedTeam === team.id ? team.color : undefined }}
                    >
                        {team.name[lang]}
                    </button>
                ))}
            </div>

            {/* Write Form */}
            {isFormVisible && (
                <form onSubmit={handleCreatePost} className="bg-slate-900/90 border border-slate-700 p-6 rounded-2xl mb-8 shadow-2xl backdrop-blur-md animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <PenTool size={16} className="text-red-500" />
                        {lang === 'ko' ? '새 게시글 작성' : 'Create New Post'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <select
                            value={targetTeam}
                            onChange={(e) => setTargetTeam(e.target.value)}
                            className="bg-slate-800 border-slate-600 rounded-lg p-3 text-white outline-none focus:border-red-500"
                        >
                            <option value="ALL">General (All Teams)</option>
                            {TEAMS.map(t => <option key={t.id} value={t.id}>{t.name[lang]}</option>)}
                        </select>
                        <input
                            type="text"
                            placeholder={lang === 'ko' ? "작성자 닉네임" : "Author Name"}
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            className="bg-slate-800 border-slate-600 rounded-lg p-3 text-white outline-none focus:border-red-500"
                            maxLength={20}
                        />
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder={lang === 'ko' ? "제목을 입력하세요..." : "Enter title..."}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-800 border-slate-600 rounded-lg p-3 text-white focus:border-red-500 outline-none font-bold text-lg"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <textarea
                            placeholder={lang === 'ko' ? "내용을 입력하세요..." : "Enter content..."}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-slate-800 border-slate-600 rounded-lg p-3 text-white focus:border-red-500 outline-none h-32 resize-none"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsFormVisible(false)}
                            className="bg-transparent hover:bg-slate-800 text-slate-400 px-4 py-2 rounded-lg font-bold text-xs"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Wait...' : (
                                <>
                                    <Send size={14} /> {lang === 'ko' ? '등록' : 'Submit'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* Post List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-20 text-slate-500 animate-pulse">Loading Paddock Data...</div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                        <p>{lang === 'ko' ? '게시글이 없습니다.' : 'No posts yet.'}</p>
                    </div>
                ) : (
                    posts.map((post) => {
                        const team = TEAMS.find(t => t.id === post.team_id);
                        return (
                            <div
                                key={post.id}
                                onClick={() => openPostDetail(post)}
                                className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl hover:bg-slate-800/80 hover:border-slate-600 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                {team && (
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-white/5 rounded-bl-full pointer-events-none"
                                        style={{ backgroundColor: `${team.color}10` }}
                                    />
                                )}

                                <div className="flex justify-between items-start mb-2 relative z-10">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            {team ? (
                                                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded text-black" style={{ backgroundColor: team.color }}>
                                                    {team.name[lang]}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                                    GENERAL
                                                </span>
                                            )}
                                            <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1">
                                                {post.title}
                                            </h3>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1 min-w-fit">
                                        <Clock size={12} />
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <p className="text-slate-400 text-sm mb-3 line-clamp-2 relative z-10">{post.content}</p>

                                <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase tracking-wider border-t border-slate-800 pt-3 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <User size={12} className="text-slate-400" />
                                        {post.author}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
                                            <Eye size={12} /> {post.views || 0}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Post Detail Modal */}
            {selectedPost && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedPost(null)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-start">
                            <div className="pr-8">
                                <div className="flex items-center gap-2 mb-2">
                                    {selectedPost.team_id ? (
                                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded text-black"
                                            style={{ backgroundColor: TEAMS.find(t => t.id === selectedPost.team_id)?.color || '#ddd' }}>
                                            {TEAMS.find(t => t.id === selectedPost.team_id)?.name[lang]}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-slate-700 text-slate-300">GENERAL</span>
                                    )}
                                    <span className="text-[10px] text-slate-500 font-mono">{new Date(selectedPost.created_at).toLocaleString()}</span>
                                </div>
                                <h3 className="text-2xl font-black text-white leading-tight">{selectedPost.title}</h3>
                                <div className="flex items-center gap-4 mt-2 text-xs font-bold text-slate-500">
                                    <span className="flex items-center gap-1"><User size={12} /> {selectedPost.author}</span>
                                    <span className="flex items-center gap-1"><Eye size={12} /> {selectedPost.views} Views</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedPost(null)} className="text-slate-500 hover:text-white transition-colors bg-slate-800 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 overflow-y-auto min-h-[150px] max-h-[400px] bg-slate-900">
                            <p className="text-slate-200 text-base whitespace-pre-wrap leading-relaxed">
                                {selectedPost.content}
                            </p>
                        </div>

                        {/* Comments Section */}
                        <div className="flex-1 bg-slate-950 border-t border-slate-800 flex flex-col min-h-[300px]">
                            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
                                <MessageCircle size={16} className="text-cyan-500" />
                                <span className="text-sm font-bold text-white uppercase tracking-wider">
                                    {lang === 'ko' ? `댓글 (${selectedPost.comments?.length || 0})` : `Comments (${selectedPost.comments?.length || 0})`}
                                </span>
                            </div>

                            {/* Comment List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {selectedPost.comments && selectedPost.comments.length > 0 ? (
                                    selectedPost.comments.map(comment => (
                                        <div key={comment.id} className="flex gap-3 animate-fade-in">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                                                <User size={14} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-slate-300">{comment.author}</span>
                                                    <span className="text-[10px] text-slate-600 font-mono">{new Date(comment.created_at).toLocaleString()}</span>
                                                </div>
                                                <div className="bg-slate-900 p-3 rounded-r-xl rounded-bl-xl border border-slate-800 text-sm text-slate-400">
                                                    {comment.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-600 text-sm italic">
                                        {lang === 'ko' ? '첫 댓글을 남겨주세요' : 'Be the first to comment'}
                                    </div>
                                )}
                            </div>

                            {/* Comment Write */}
                            <form onSubmit={handleCreateComment} className="p-4 bg-slate-900 border-t border-slate-800">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={commentContent}
                                        onChange={e => setCommentContent(e.target.value)}
                                        placeholder={lang === 'ko' ? "댓글을 입력하세요..." : "Write a reply..."}
                                        className="flex-1 bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isCommentLoading || !commentContent.trim()}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white p-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BoardPage;
