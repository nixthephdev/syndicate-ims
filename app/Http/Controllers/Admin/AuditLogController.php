<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\Csv;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Response as HttpResponse;

/**
 * Admin-only: who on the team did what, and when. Read-only — there is no
 * edit or delete for a log entry anywhere in the app, by design.
 */
class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $logs = $this->filtered($request)
            ->paginate(30)
            ->withQueryString()
            ->through(fn (AuditLog $log) => $this->row($log));

        return Inertia::render('Admin/AuditLog/Index', [
            'logs' => $logs,
            'filters' => $request->only(['group', 'user', 'from', 'to', 'q']),
            'groups' => AuditLog::ACTION_GROUPS,
            // Everyone who has ever been staff/admin AND appears in the log,
            // so a since-demoted account's history is still filterable.
            'team' => User::query()
                ->whereIn('id', AuditLog::query()->whereNotNull('user_id')->distinct()->pluck('user_id'))
                ->orderBy('name')
                ->get(['id', 'name', 'role']),
        ]);
    }

    public function export(Request $request): HttpResponse
    {
        // Exporting the log is itself worth a line in the log.
        AuditLog::record(AuditLog::ACTION_EXPORT, 'Exported the audit log.');

        $logs = $this->filtered($request)->limit(10000)->get();

        return Csv::download(
            'audit-log-'.now()->format('Y-m-d').'.csv',
            ['When', 'Who', 'Role', 'Action', 'What happened', 'Item', 'Changes', 'IP address'],
            $logs->map(fn (AuditLog $log) => [
                $log->created_at->format('Y-m-d H:i:s'),
                $log->actor_name ?? 'System',
                $log->actor_role,
                $log->action,
                $log->description,
                $log->subject_label,
                collect($log->changes ?? [])
                    ->map(fn ($pair, $field) => "{$field}: ".json_encode($pair[0]).' -> '.json_encode($pair[1]))
                    ->implode('; '),
                $log->ip_address,
            ])
        );
    }

    private function filtered(Request $request): Builder
    {
        $group = $request->query('group');

        return AuditLog::query()
            ->when(array_key_exists((string) $group, AuditLog::ACTION_GROUPS), fn ($q) => $q->inGroup($group))
            ->when($request->query('user'), fn ($q, $id) => $q->where('user_id', $id))
            ->when($this->date($request->query('from')), fn ($q, $d) => $q->where('created_at', '>=', $d->startOfDay()))
            ->when($this->date($request->query('to')), fn ($q, $d) => $q->where('created_at', '<=', $d->endOfDay()))
            ->when($request->query('q'), fn ($q, $term) => $q->where(function ($q) use ($term) {
                $q->where('description', 'like', "%{$term}%")
                    ->orWhere('subject_label', 'like', "%{$term}%")
                    ->orWhere('actor_name', 'like', "%{$term}%");
            }))
            ->latest('created_at')
            ->latest('id');
    }

    private function date(?string $value): ?Carbon
    {
        try {
            return $value ? Carbon::createFromFormat('Y-m-d', $value) : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function row(AuditLog $log): array
    {
        return [
            'id' => $log->id,
            'at' => $log->created_at->format('d M Y, g:i:sa'),
            'ago' => $log->created_at->diffForHumans(),
            'actor_name' => $log->actor_name ?? 'System',
            'actor_role' => $log->actor_role,
            'action' => $log->action,
            'group' => strtok($log->action, '.'),
            'description' => $log->description,
            'subject_label' => $log->subject_label,
            'changes' => $log->changes,
            'ip_address' => $log->ip_address,
        ];
    }
}
