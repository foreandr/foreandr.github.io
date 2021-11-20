using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace foreandr.github.IO.DAL
{
    public partial class foreandrContext : DbContext
    {
        public foreandrContext()
        {
        }

        public foreandrContext(DbContextOptions<foreandrContext> options)
            : base(options)
        {
        }

        public virtual DbSet<BlogPost> BlogPosts { get; set; } = null!;
        public virtual DbSet<Writer> Writers { get; set; } = null!;

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see http://go.microsoft.com/fwlink/?LinkId=723263.
                optionsBuilder.UseSqlServer("Server=(localdb)\\ProjectsV13;Database=foreandr.github.io.database;Trusted_Connection=True;");
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<BlogPost>(entity =>
            {
                entity.HasNoKey();

                entity.Property(e => e.Contents).HasMaxLength(4000);

                entity.Property(e => e.ID).ValueGeneratedOnAdd();

                entity.Property(e => e.Title).HasMaxLength(50);

                entity.Property(e => e.UploadDate).HasColumnType("date");

                entity.HasOne(d => d.Writer)
                    .WithMany()
                    .HasForeignKey(d => d.WriterID)
                    .HasConstraintName("FK__BlogPosts__Write__3A81B327");
            });

            modelBuilder.Entity<Writer>(entity =>
            {
                entity.Property(e => e.Country).HasMaxLength(80);

                entity.Property(e => e.DateOfBIrth).HasColumnType("date");

                entity.Property(e => e.FirstName).HasMaxLength(50);

                entity.Property(e => e.LastName).HasMaxLength(50);
            });

            OnModelCreatingPartial(modelBuilder);
        }

        partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
    }
}
