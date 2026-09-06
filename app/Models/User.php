<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /** Class constants, not enums — PHP 8.0. */
    public const ROLE_CUSTOMER = 'customer';
    public const ROLE_STAFF = 'staff';
    public const ROLE_ADMIN = 'admin';

    public const ROLES = [
        self::ROLE_CUSTOMER,
        self::ROLE_STAFF,
        self::ROLE_ADMIN,
    ];

    /**
     * Manual buyer ID verification. `none` is "never submitted anything" —
     * distinct from `rejected`, which has a reason attached and a photo the
     * customer has already had a go at.
     */
    public const ID_STATUS_NONE = 'none';
    public const ID_STATUS_PENDING = 'pending';
    public const ID_STATUS_APPROVED = 'approved';
    public const ID_STATUS_REJECTED = 'rejected';

    public const ID_STATUSES = [
        self::ID_STATUS_NONE,
        self::ID_STATUS_PENDING,
        self::ID_STATUS_APPROVED,
        self::ID_STATUS_REJECTED,
    ];

    /**
     * Accepted IDs. Philippine government IDs, because every customer this
     * shop has ever had is in the Philippines — same reasoning the checkout
     * address form is shaped for PH addressing rather than a generic
     * international one. Staff eyeball the photo; nothing is validated
     * against any issuing authority.
     */
    public const ID_TYPES = [
        'philsys' => 'National ID (PhilSys)',
        'drivers_license' => "Driver's License",
        'passport' => 'Passport',
        'umid' => 'UMID',
        'sss' => 'SSS ID',
        'philhealth' => 'PhilHealth ID',
        'postal' => 'Postal ID',
        'voters' => "Voter's ID",
        'student' => 'Student ID',
        'company' => 'Company ID',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * SECURITY: 'role' is deliberately absent. Breeze's registration endpoint
     * mass-assigns this array from request input, so a fillable 'role' would
     * let anyone POST role=admin to /register and self-promote. Roles are
     * assigned explicitly by an admin, never mass-assigned.
     *
     * Every `id_verification_*` column is absent for exactly the same reason,
     * and it is the same class of hole: a fillable id_verification_status
     * would let a customer POST `id_verification_status=approved` and verify
     * themselves, which is the one thing this whole feature exists to stop.
     * Staff set it through Admin\IdVerificationController, via forceFill().
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
        'id_submitted_at' => 'datetime',
        'id_reviewed_at' => 'datetime',
    ];

    /** Mirrors the column default so a new User has a real status in memory. */
    protected $attributes = [
        'id_verification_status' => self::ID_STATUS_NONE,
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /** The staff member who approved or rejected this customer's ID. */
    public function idReviewer()
    {
        return $this->belongsTo(self::class, 'id_reviewed_by');
    }

    public function idIsApproved(): bool
    {
        return $this->id_verification_status === self::ID_STATUS_APPROVED;
    }

    public function idTypeLabel(): ?string
    {
        return self::ID_TYPES[$this->id_type] ?? $this->id_type;
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /** Admins are staff too — staff-gated routes must admit admins. */
    public function isStaff(): bool
    {
        return in_array($this->role, [self::ROLE_STAFF, self::ROLE_ADMIN], true);
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isCustomer(): bool
    {
        return $this->role === self::ROLE_CUSTOMER;
    }

    public function isActive(): bool
    {
        return $this->is_active;
    }

    public function scopeRole(Builder $query, string $role): Builder
    {
        return $query->where('role', $role);
    }
}
