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

        public virtual DbSet<BLOG> BLOGs { get; set; } = null!;

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
            modelBuilder.Entity<BLOG>(entity =>
            {
                entity.ToTable("BLOG");

                entity.Property(e => e.Contents).HasMaxLength(4000);

                entity.Property(e => e.Date).HasColumnType("date");

                entity.Property(e => e.Title).HasMaxLength(50);
            });

            OnModelCreatingPartial(modelBuilder);
        }

        partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
    }
}
