import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FileUp, Send, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const CONTENT_TYPES = [
  'Social media post',
  'Advertisement',
  'Email',
  'Blog article',
  'Website copy',
  'Internal announcement',
];

const CHANNELS = [
  'LinkedIn',
  'Instagram',
  'Website',
  'Email',
  'Internal communication',
  'Other',
];

const DEMO_TEST_COPY =
  "Join India's No. 1 trusted gardening platform for cheap starter kits and guaranteed results! Get your order delivered within 2 hours anywhere in your city. We also have [image] showing our spring planters.";

export function NewReviewPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      contentType: 'Social media post',
      channel: 'LinkedIn',
      departmentId: user?.departmentId || 1,
      content: '',
    },
  });

  const contentValue = watch('content');

  useEffect(() => {
    api
      .get('/departments')
      .then((res) => {
        setDepartments(res.data.departments || []);
        if (user?.departmentId) {
          setValue('departmentId', user.departmentId);
        } else if (res.data.departments?.[0]) {
          setValue('departmentId', res.data.departments[0].id);
        }
      })
      .catch(() => {
        notify('Could not load departments.', 'error');
      });
  }, [user, setValue, notify]);

  const handleDocxUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/extract-docx', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValue('content', res.data.text, { shouldValidate: true });
      setUploadedFilename(res.data.filename);
      if (!watch('title')) {
        setValue('title', res.data.filename.replace(/\.docx$/i, ''));
      }
      notify(`Extracted text from ${res.data.filename}.`, 'success');
    } catch (err) {
      const msg =
        err?.response?.data?.error || 'Failed to extract DOCX content.';
      notify(msg, 'error');
    } finally {
      setExtracting(false);
    }
  };

  const loadCrossDeptDemoSample = () => {
    setValue('title', 'Spring Campaign — Urban Gardening Launch', {
      shouldValidate: true,
    });
    setValue('content', DEMO_TEST_COPY, { shouldValidate: true });
    notify(
      'Loaded demonstration copy with claims, banned words, and alt-text check.',
      'info'
    );
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const res = await api.post('/submissions', {
        ...values,
        departmentId: Number(values.departmentId),
        autoReview: true,
      });

      notify(
        `Review complete: ${res.data.review.findingsCount} findings and ${res.data.review.claimsCount} claims detected.`,
        'success'
      );
      navigate(`/submissions/${res.data.submission.id}`);
    } catch (err) {
      const msg =
        err?.response?.data?.error || 'Failed to submit content for review.';
      notify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isDepartmentLocked =
    user?.role !== 'Admin' && Boolean(user?.departmentId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            New Content Review
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Submit copy or a DOCX file. BrandOS checks only against your selected department’s guidelines and approved facts.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCrossDeptDemoSample}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>Load Demo Sample Copy</span>
        </button>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Submission Title
            </label>
            <input
              type="text"
              {...register('title', { required: 'Submission title is required.' })}
              placeholder="e.g., Spring Urban Gardening Launch Post"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Content Type
            </label>
            <select
              {...register('contentType', { required: true })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Publishing Channel
            </label>
            <select
              {...register('channel', { required: true })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department Knowledge Scope
            </label>
            <select
              {...register('departmentId', { valueAsNumber: true })}
              disabled={isDepartmentLocked}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:border-indigo-500 focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.toneProfile}
                </option>
              ))}
            </select>
            {isDepartmentLocked && (
              <p className="mt-1 text-xs text-slate-500">
                Restricted to your assigned department ({user?.departmentName}).
              </p>
            )}
          </div>
        </div>

        {/* DOCX Upload */}
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-600">
            <div className="font-semibold text-slate-900">
              Upload DOCX Document (Optional)
            </div>
            <div className="mt-0.5">
              {uploadedFilename
                ? `Extracted text loaded from ${uploadedFilename}`
                : 'Extract paragraphs directly from a .docx draft into the editor below.'}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0">
            <FileUp className="h-3.5 w-3.5 text-indigo-600" />
            <span>{extracting ? 'Extracting...' : 'Choose .docx File'}</span>
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleDocxUpload}
              className="hidden"
              disabled={extracting}
            />
          </label>
        </div>

        {/* Large Content Editor */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Content Draft (Version 1 Snapshot)
            </label>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {contentValue.trim() ? contentValue.trim().split(/\s+/).length : 0} words
            </span>
          </div>
          <textarea
            rows={9}
            {...register('content', {
              required: 'Please enter or upload content to review.',
              minLength: {
                value: 10,
                message: 'Content must be at least 10 characters.',
              },
            })}
            placeholder="Paste your marketing post, HR memo, or sales proposal here..."
            className="w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm text-slate-900 leading-relaxed focus:border-indigo-500 focus:outline-none"
          />
          {errors.content && (
            <p className="mt-1 text-xs text-red-600">{errors.content.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/submissions')}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? 'Running BrandOS Review...' : 'Save v1 & Run Review'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
