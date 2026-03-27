import { format, parseISO } from "date-fns";

interface Post {
    _id: string;
    slug: string;
    title: string;
    description: string;
    date: string;
    readTime?: string;
    tags: string[];
}

interface PostListProps {
    posts: Post[];
}

// Group posts by year
function groupByYear(posts: Post[]): Record<string, Post[]> {
    return posts.reduce(
        (acc, post) => {
            const year = post.date.substring(0, 4);
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(post);
            return acc;
        },
        {} as Record<string, Post[]>
    );
}

export default function PostList({ posts }: PostListProps) {
    // Sort posts by date descending
    const sortedPosts = [...posts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const groupedPosts = groupByYear(sortedPosts);
    const years = Object.keys(groupedPosts).sort((a, b) => Number(b) - Number(a));

    return (
        <div className="post-list">
            {years.map((year) => (
                <div key={year} className="post-year-group">
                    <h2 className="year-heading">{year}</h2>
                    <ul className="posts">
                        {groupedPosts[year].map((post) => (
                            <li key={post._id} className="post-item">
                                <a href={`/blog/${post.slug}`} className="post-link">
                                    <span className="post-title">{post.title}</span>
                                    <span className="post-meta">
                                        {post.readTime && (
                                            <span className="post-read-time">{post.readTime}</span>
                                        )}
                                        <span className="post-date">
                                            {format(parseISO(post.date), "MMMM d")}
                                        </span>
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
