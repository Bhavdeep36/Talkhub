﻿using System.Data;
using ChatApp.Models.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)

{
    public DbSet<AppRoles> AppRoles { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<ProfilePicture> ProfilePictures { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppRoles>(e =>
        {
            e.ToTable("role");
            e.HasKey(r => r.RoleId);

            e.Property(r => r.RoleId)
                .ValueGeneratedOnAdd()
                .HasColumnName("role_id");

            e.Property(r => r.RoleName)
                .IsRequired()
                .HasColumnName("role_name");
        });

        modelBuilder.Entity<AppRoles>().HasData(
            new AppRoles
            {
                RoleId = 1,
                RoleName = "Admin"
            },
            new AppRoles
            {
                RoleId = 2,
                RoleName = "User"
            }
        );

        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("user");

            e.HasKey(u => u.Id);

            e.Property(u => u.Id)
                .ValueGeneratedOnAdd()
                .HasColumnName("user_id");

            e.Property(u => u.UserName).HasColumnName("username").IsRequired();
            e.Property(u => u.PasswordHash).HasColumnName("password_hash").IsRequired();
            e.Property(u => u.Email).HasColumnName("email").IsRequired();
            e.Property(u => u.RoleId).HasColumnName("roleId").IsRequired();
            e.Property(u => u.Created).HasColumnName("created").IsRequired();

            e.HasOne(u => u.Role)
             .WithMany()              
             .HasForeignKey(u => u.RoleId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasMany(u => u.SentMessages)
             .WithOne(m => m.Sender)
             .HasForeignKey(m => m.SenderId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasMany(u => u.ReceivedMessages)
             .WithOne(m => m.Receiver)
             .HasForeignKey(m => m.ReceiverId)
             .OnDelete(DeleteBehavior.Restrict);

        });


        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                UserName = "admin",
                PasswordHash = "admin123", 
                Email = "admin@gmail.com",
                RoleId = 1,
                Created = DateTime.UtcNow,

            },
            new User
            {
                Id = 2,
                UserName = "receiver",
                PasswordHash = "receiver123", 
                Email = "receiver@gmail.com",
                RoleId = 2,
                Created = DateTime.UtcNow,

            },
            new User
            {
                Id = 3,
                UserName = "sender",
                PasswordHash = "sender123", 
                Email = "sender@gmail.com",
                RoleId = 2,
                Created = DateTime.UtcNow,
            }
        );

        modelBuilder.Entity<Message>(e =>
        {
            e.ToTable("message");
            e.HasKey(m => m.MessageId);

            e.Property(m => m.MessageId)
                .ValueGeneratedOnAdd()
                .HasColumnName("message_id");

            e.Property(m => m.SenderId)
            .HasColumnName("sender_id")
            .IsRequired();

            e.Property(m => m.ReceiverId)
            .HasColumnName("receiver_id")
            .IsRequired();


            e.Property(m => m.Content).HasColumnName("content").IsRequired();
            e.Property(m => m.Created).HasColumnName("created").IsRequired();
            e.Property(m => m.Updated).HasColumnName("updated").IsRequired(false);
        });

        modelBuilder.Entity<Message>().HasData(
            new Message
            {
                MessageId = 1,
                SenderId = 3,
                ReceiverId = 2,
                Content = "Hello, how are you?",
                Created = DateTime.UtcNow
            },
            new Message
            {
                MessageId = 2,
                SenderId = 3,
                ReceiverId = 2,
                Content = "I am fine. Thank you.",
                Created = DateTime.UtcNow
            }
        );
        modelBuilder.Entity<ProfilePicture>(e =>
        {
            e.ToTable("profile_picture");

            e.HasKey(p => p.Id);

            e.Property(p => p.Id)
                .ValueGeneratedOnAdd()
                .HasColumnName("id");

            e.Property(p => p.UserId)
                .HasColumnName("user_id")
                .IsRequired();

            e.Property(p => p.ImageUrl)
                .HasColumnName("ImageUrl")
                .IsRequired();


            e.Property(p => p.UploadedAt)
                .HasColumnName("uploaded_at")
                .IsRequired();
            
            e.Property(p => p.UpdatedAt)
                .HasColumnName("updated_at")
                .IsRequired(false);


            e.HasOne(p => p.User)
             .WithOne(u => u.ProfilePicture)
             .HasForeignKey<ProfilePicture>(p => p.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        }


       );
    }
}








