'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Users, Mail, Trash2, Shield, Crown, Eye, UserPlus, Loader2, Lock, Settings, Plus, Bot, Key, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ProfileList } from '@/components/permissions/profile-list';
import { MemberAssignments } from '@/components/permissions/member-assignments';
import { CreateProfileDialog } from '@/components/permissions/create-profile-dialog';
import {
  aiSettingsSchema,
  aiProviders,
  modelOptions,
  type AISettingsFormData,
} from '@/lib/validations/ai';

interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  role: string;
}

interface Member {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  member: Users,
  viewer: Eye,
};

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export default function TeamSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [team, setTeam] = React.useState<Team | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [invitations, setInvitations] = React.useState<Invitation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [teamName, setTeamName] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<string>('member');
  const [inviting, setInviting] = React.useState(false);
  const [createProfileDialogOpen, setCreateProfileDialogOpen] = React.useState(false);
  const [profileListKey, setProfileListKey] = React.useState(0);
  const [aiLoading, setAiLoading] = React.useState(true);
  const [aiSaving, setAiSaving] = React.useState(false);
  const [aiConfigured, setAiConfigured] = React.useState(false);

  const aiForm = useForm<AISettingsFormData>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      provider: 'openai',
      apiKey: '',
      model: '',
      temperature: 0.7,
      maxTokens: 2048,
      baseUrl: '',
    },
  });

  const watchedProvider = aiForm.watch('provider');

  React.useEffect(() => {
    fetchTeamData();
    fetchAISettings();
  }, [teamId]);

  const fetchAISettings = async () => {
    setAiLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/ai-settings`);
      if (response.ok) {
        const data = await response.json();
        setAiConfigured(data.configured);
        if (data.configured) {
          aiForm.reset({
            provider: data.provider || 'openai',
            apiKey: '', // Don't populate API key for security
            model: data.model || '',
            temperature: data.temperature || 0.7,
            maxTokens: data.maxTokens || 2048,
            baseUrl: data.baseUrl || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAISettings = async (data: AISettingsFormData) => {
    setAiSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/ai-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save AI settings');
      }

      setAiConfigured(true);
      toast.success('AI settings saved successfully');
      aiForm.setValue('apiKey', ''); // Clear API key field after save
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save AI settings');
    } finally {
      setAiSaving(false);
    }
  };

  const fetchTeamData = async () => {
    try {
      const [teamRes, membersRes, invitationsRes] = await Promise.all([
        fetch(`/api/teams/${teamId}`),
        fetch(`/api/teams/${teamId}/members`),
        fetch(`/api/teams/${teamId}/invitations`),
      ]);

      if (!teamRes.ok) {
        toast.error('Team not found');
        router.push('/dashboard');
        return;
      }

      const teamData = await teamRes.json();
      setTeam(teamData);
      setTeamName(teamData.name);

      if (membersRes.ok) {
        setMembers(await membersRes.json());
      }

      if (invitationsRes.ok) {
        setInvitations(await invitationsRes.json());
      }
    } catch (error) {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!teamName.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName }),
      });

      if (response.ok) {
        const updated = await response.json();
        setTeam((prev) => (prev ? { ...prev, name: updated.name } : null));
        toast.success('Team updated');
      } else {
        toast.error('Failed to update team');
      }
    } catch (error) {
      toast.error('Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.type === 'member') {
          setMembers((prev) => [...prev, result.data]);
          toast.success('Member added');
        } else {
          setInvitations((prev) => [...prev, result.data]);
          toast.success('Invitation sent');
        }
        setInviteEmail('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to invite member');
      }
    } catch (error) {
      toast.error('Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.userId === userId ? { ...m, role } : m))
        );
        toast.success('Role updated');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update role');
      }
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
        toast.success('Member removed');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove member');
      }
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invitations?invitationId=${invitationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
        toast.success('Invitation cancelled');
      } else {
        toast.error('Failed to cancel invitation');
      }
    } catch (error) {
      toast.error('Failed to cancel invitation');
    }
  };

  const handleDeleteTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Team deleted');
        router.push('/dashboard');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete team');
      }
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  const canManage = team?.role === 'owner' || team?.role === 'admin';
  const isOwner = team?.role === 'owner';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-muted-foreground">Team Settings</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="h-4 w-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Lock className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Team Info */}
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
              <CardDescription>Update your team details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="teamName">Team Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    disabled={!canManage}
                  />
                  {canManage && (
                    <Button onClick={handleUpdateTeam} disabled={saving || teamName === team.name}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Team URL</Label>
                <Input value={team.slug} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>{members.length} member{members.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManage && (
                <form onSubmit={handleInviteMember} className="flex gap-2">
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {inviting ? 'Inviting...' : 'Invite'}
                  </Button>
                </form>
              )}

              <div className="divide-y">
                {members.map((member) => {
                  const RoleIcon = roleIcons[member.role] || Users;
                  return (
                    <div key={member.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {member.user?.email?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.user?.name || member.user?.email}</p>
                          <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManage && member.role !== 'owner' ? (
                          <Select
                            value={member.role}
                            onValueChange={(role) => handleUpdateMemberRole(member.userId, role)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <RoleIcon className="h-3 w-3" />
                            {roleLabels[member.role]}
                          </Badge>
                        )}
                        {canManage && member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.userId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {canManage && invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>{invitations.length} pending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited as {roleLabels[invitation.role]} • Expires{' '}
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          {isOwner && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Team
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete team?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the team &quot;{team.name}&quot; and all its data,
                        including shared connections and saved queries. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete Team
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Settings Tab */}
        <TabsContent value="ai" className="space-y-6">
          {!canManage && (
            <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
              <CardHeader>
                <CardTitle className="text-sm">View Only</CardTitle>
                <CardDescription>
                  You can view AI settings but cannot make changes. Contact a team owner or admin to configure AI.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle>Workspace AI Configuration</CardTitle>
              </div>
              <CardDescription>
                Configure AI settings for this workspace. These settings will be used by all team members when using AI features within this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Form {...aiForm}>
                  <form onSubmit={aiForm.handleSubmit(handleSaveAISettings)} className="space-y-6">
                    <FormField
                      control={aiForm.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AI Provider</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} disabled={!canManage}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {aiProviders.map((provider) => (
                                <SelectItem key={provider} value={provider}>
                                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose your AI provider. Ollama runs locally for free.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchedProvider !== 'ollama' && (
                      <FormField
                        control={aiForm.control}
                        name="apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Key className="h-4 w-4" />
                              API Key
                              {aiConfigured && (
                                <Badge variant="secondary" className="text-xs">Configured</Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder={aiConfigured ? 'Leave blank to keep existing key' : 'Enter your API key'}
                                {...field}
                                value={field.value || ''}
                                disabled={!canManage}
                              />
                            </FormControl>
                            <FormDescription>
                              Your API key is encrypted and stored securely. Leave blank to keep existing key.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {(watchedProvider === 'ollama' || watchedProvider === 'custom') && (
                      <FormField
                        control={aiForm.control}
                        name="baseUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={watchedProvider === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com'}
                                {...field}
                                value={field.value || ''}
                                disabled={!canManage}
                              />
                            </FormControl>
                            <FormDescription>
                              {watchedProvider === 'ollama'
                                ? 'URL of your Ollama server (default: http://localhost:11434)'
                                : 'Base URL for your custom API endpoint'
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={aiForm.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          {modelOptions[watchedProvider]?.length > 0 ? (
                            <Select value={field.value || ''} onValueChange={field.onChange} disabled={!canManage}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {modelOptions[watchedProvider].map((model) => (
                                  <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <FormControl>
                              <Input
                                placeholder="Enter model name"
                                {...field}
                                value={field.value || ''}
                                disabled={!canManage}
                              />
                            </FormControl>
                          )}
                          <FormDescription>
                            The AI model to use for queries. Different models have different capabilities.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={aiForm.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="2"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                disabled={!canManage}
                              />
                            </FormControl>
                            <FormDescription>
                              0 = deterministic, 2 = creative
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={aiForm.control}
                        name="maxTokens"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Tokens</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="100"
                                max="128000"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                disabled={!canManage}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum response length
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {canManage && (
                      <Button type="submit" disabled={aiSaving}>
                        {aiSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Save AI Settings
                      </Button>
                    )}
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {!aiConfigured && canManage && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Not Configured</CardTitle>
                <CardDescription>
                  AI is not yet configured for this workspace. Configure AI settings above to enable natural language queries and database analysis for your team.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          {!canManage && (
            <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
              <CardHeader>
                <CardTitle className="text-sm">View Only</CardTitle>
                <CardDescription>
                  You can view permission settings but cannot make changes. Contact a team owner or admin to modify permissions.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Permission Profiles */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Permission Profiles
                  </CardTitle>
                  <CardDescription>
                    Create reusable permission templates for your team members
                  </CardDescription>
                </div>
                {canManage && (
                  <Button onClick={() => setCreateProfileDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ProfileList key={profileListKey} teamId={teamId} canManage={canManage} />
            </CardContent>
          </Card>

          {/* Member Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Member Assignments
              </CardTitle>
              <CardDescription>
                Assign permission profiles or custom permissions to team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MemberAssignments teamId={teamId} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateProfileDialog
        open={createProfileDialogOpen}
        onOpenChange={setCreateProfileDialogOpen}
        teamId={teamId}
        onCreated={() => setProfileListKey((k) => k + 1)}
      />
    </div>
  );
}
