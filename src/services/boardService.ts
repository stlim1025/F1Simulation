
export interface Post {
    id: number;
    title: string;
    content: string;
    author: string;
    created_at: string;
}

const API_URL = '/api/posts';

export const BoardService = {
    async getPosts(): Promise<Post[]> {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to fetch posts');
            return await response.json();
        } catch (error) {
            console.error('Error fetching posts:', error);
            return [];
        }
    },

    async createPost(post: { title: string; content: string; author: string }): Promise<Post | null> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create post: ${response.status} ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating post:', error);
            return null;
        }
    }
};
