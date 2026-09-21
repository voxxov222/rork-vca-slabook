import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn } from 'react-native-reanimated';
import { makeStyles, useTheme } from '@/src/theme';
import { usesNativeTabs } from '@/src/navigation';
import { api } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { Icon } from '@/src/components/Icon';
import { Avatar, Surface, Skeleton } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';

type Comment = { id: string; author: string; picture?: string | null; text: string; at: string };
type Post = {
  id: string;
  author: { name: string; picture?: string | null; profile_type?: string };
  text: string;
  image?: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  comments: Comment[];
  created_at: string;
};

export default function Slabook() {
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const q = useQuery({ queryKey: ['feed'], queryFn: () => api.get<Post[]>('/feed') });

  const post = useMutation({
    mutationFn: (text: string) => api.post<Post>('/posts', { text }),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['feed'] });
      toast.show('Posted to Slabook', 'success');
    },
  });

  const like = useMutation({
    mutationFn: (id: string) => api.post<any>(`/posts/${id}/like`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const comment = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => api.post<any>(`/posts/${id}/comments`, { text }),
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={s.headerTitle}>Slabook</Text>
          <Text style={s.headerSub}>The collector community</Text>
        </View>
        <Icon name="account-group" size={26} color={colors.accent} />
      </View>

      <FlatList
        data={q.data || []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomChrome + 28, gap: 14 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Surface style={s.composer}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Avatar uri={user?.picture} name={user?.name} size={38} />
              <TextInput
                style={s.composerInput}
                placeholder="Show off a slab, grade, or pickup…"
                placeholderTextColor={colors.textMuted}
                value={draft}
                onChangeText={setDraft}
                multiline
                testID="composer-input"
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <Pressable
                style={[s.postBtn, (!draft.trim() || post.isPending) && { opacity: 0.5 }]}
                disabled={!draft.trim() || post.isPending}
                onPress={() => post.mutate(draft.trim())}
                testID="composer-post"
              >
                <Icon name="send" size={16} color="#fff" />
                <Text style={s.postBtnText}>Post</Text>
              </Pressable>
            </View>
          </Surface>
        }
        ListEmptyComponent={
          q.isLoading ? (
            <View style={{ gap: 14 }}>
              {[1, 2].map((i) => (
                <Skeleton key={i} height={220} radius={16} />
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn}>
            <Surface style={s.post}>
              <View style={s.postHead}>
                <Avatar uri={item.author.picture} name={item.author.name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={s.author}>{item.author.name}</Text>
                  {item.author.profile_type ? <Text style={s.authorType}>{item.author.profile_type}</Text> : null}
                </View>
              </View>
              {item.text ? <Text style={s.postText}>{item.text}</Text> : null}
              {item.image ? (
                <View style={s.postImageWrap}>
                  <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} />
                </View>
              ) : null}
              <View style={s.actions}>
                <Pressable style={s.action} onPress={() => like.mutate(item.id)} testID={`like-${item.id}`}>
                  <Icon name={item.liked_by_me ? 'heart' : 'heart-outline'} size={20} color={item.liked_by_me ? colors.accent : colors.textSecondary} />
                  <Text style={s.actionText}>{item.like_count}</Text>
                </Pressable>
                <Pressable style={s.action} onPress={() => setExpanded(expanded === item.id ? null : item.id)} testID={`comment-${item.id}`}>
                  <Icon name="comment-outline" size={19} color={colors.textSecondary} />
                  <Text style={s.actionText}>{item.comment_count}</Text>
                </Pressable>
              </View>

              {expanded === item.id && (
                <View style={s.comments}>
                  {item.comments.map((c) => (
                    <View key={c.id} style={s.commentRow}>
                      <Avatar uri={c.picture} name={c.author} size={28} />
                      <View style={s.commentBubble}>
                        <Text style={s.commentAuthor}>{c.author}</Text>
                        <Text style={s.commentText}>{c.text}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={s.commentInputRow}>
                    <TextInput
                      style={s.commentInput}
                      placeholder="Add a comment…"
                      placeholderTextColor={colors.textMuted}
                      value={commentText}
                      onChangeText={setCommentText}
                      testID={`comment-input-${item.id}`}
                    />
                    <Pressable
                      onPress={() => commentText.trim() && comment.mutate({ id: item.id, text: commentText.trim() })}
                      style={s.commentSend}
                    >
                      <Icon name="send" size={16} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              )}
            </Surface>
          </Animated.View>
        )}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: t.colors.background,
    borderBottomWidth: 1, borderBottomColor: t.colors.divider,
  },
  headerTitle: { color: t.colors.text, fontSize: 24, fontWeight: '900' },
  headerSub: { color: t.colors.textMuted, fontSize: 13 },
  composer: { padding: 14 },
  composerInput: { flex: 1, color: t.colors.text, fontSize: 15, minHeight: 40, maxHeight: 120 },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  postBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  post: { padding: 14 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  author: { color: t.colors.text, fontWeight: '800', fontSize: 15 },
  authorType: { color: t.colors.accent, fontSize: 11, fontWeight: '700' },
  postText: { color: t.colors.text, fontSize: 14, lineHeight: 20 },
  postImageWrap: { height: 260, borderRadius: 12, overflow: 'hidden', backgroundColor: t.colors.background, marginTop: 10, borderWidth: 1, borderColor: t.colors.border },
  actions: { flexDirection: 'row', gap: 22, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.colors.divider },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: t.colors.textSecondary, fontWeight: '700', fontSize: 13 },
  comments: { marginTop: 12, gap: 10 },
  commentRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  commentBubble: { flex: 1, backgroundColor: t.colors.background, borderRadius: 12, padding: 10 },
  commentAuthor: { color: t.colors.text, fontWeight: '800', fontSize: 12 },
  commentText: { color: t.colors.textSecondary, fontSize: 13, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  commentInput: { flex: 1, backgroundColor: t.colors.background, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, color: t.colors.text, borderWidth: 1, borderColor: t.colors.border },
  commentSend: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
}));
