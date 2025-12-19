export interface Comment {
    id: number;
    post_id: number;
    content: string;
    author: string;
    created_at: string;
}

export interface Post {
    id: number;
    title: string;
    content: string;
    author: string;
    team_id?: string;
    views: number;
    comments?: Comment[];
    created_at: string;
}

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`;

export const BoardService = {
    async getPosts(teamId?: string): Promise<Post[]> {
        try {
            let url = `${API_BASE}/posts`;
            if (teamId) url += `?teamId=${teamId}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch posts');
            return await response.json();
        } catch (error) {
            console.error('Error fetching posts:', error);
            return [];
        }
    },

    async getPostById(id: number): Promise<Post | null> {
        try {
            const response = await fetch(`${API_BASE}/posts/${id}`);
            if (!response.ok) throw new Error('Failed to fetch post');
            return await response.json();
        } catch (error) {
            console.error('Error fetching post detail:', error);
            return null;
        }
    },

    async createPost(post: { title: string; content: string; author: string; teamId?: string }): Promise<Post | null> {
        try {
            const response = await fetch(`${API_BASE}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post),
            });
            if (!response.ok) throw new Error('Failed to create post');
            return await response.json();
        } catch (error) {
            console.error('Error creating post:', error);
            return null;
        }
    },

    async createComment(comment: { postId: number; content: string; author: string }): Promise<Comment | null> {
        try {
            const response = await fetch(`${API_BASE}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(comment),
            });
            if (!response.ok) throw new Error('Failed to create comment');
            return await response.json();
        } catch (error) {
            console.error('Error creating comment:', error);
            return null;
        }
    }
};
