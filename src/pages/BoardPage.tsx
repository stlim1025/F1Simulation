import React, { useState, useEffect } from 'react';
import { BoardService, Post } from '../services/boardService';
import { TRANSLATIONS } from '../constants';
import { MessageSquare, Send, User, Clock, PenTool } from 'lucide-react';

interface Props {
    lang: 'ko' | 'en';
}

const BoardPage: React.FC<Props> = ({ lang }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState(localStorage.getItem('f1_nickname') || 'Anonymous');
    const [isLoading, setIsLoading] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);

    const fetchPosts = async () => {
        const data = await BoardService.getPosts();
        setPosts(data);
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setIsLoading(true);
        const newPost = await BoardService.createPost({ title, content, author });
        if (newPost) {
            setPosts([newPost, ...posts]);
            setTitle('');
            setContent('');
            setIsFormVisible(false);
        }
        setIsLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                    <MessageSquare className="text-red-600" size={32} />
                    {lang === 'ko' ? '엔지니어링 게시판' : 'Engineering Board'}
                </h2>
                <button
                    onClick={() => setIsFormVisible(!isFormVisible)}
                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-sm tracking-widest flex items-center gap-2 transition-all shadow-lg hover:shadow-red-900/50"
                >
                    <PenTool size={18} />
                    {lang === 'ko' ? '글쓰기' : 'Write Post'}
                </button>
            </div>

            {isFormVisible && (
                <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl mb-8 shadow-2xl backdrop-blur-sm animate-fade-in">
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
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <User size={14} />
                            <span>Author: {author}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-white text-slate-900 hover:bg-slate-200 px-6 py-2 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-colors disabled:opacity-50"
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

            <div className="space-y-4">
                {posts.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <p>{lang === 'ko' ? '게시글이 없습니다.' : 'No posts yet.'}</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-600 transition-colors group">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">{post.title}</h3>
                                <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(post.created_at).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-slate-300 text-sm mb-4 whitespace-pre-wrap">{post.content}</p>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                    <User size={12} />
                                </div>
                                {post.author}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BoardPage;
