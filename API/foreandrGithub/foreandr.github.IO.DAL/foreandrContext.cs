//using System;
//using System.Collections.Generic;
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

                optionsBuilder.UseSqlServer("Server=(localdb)\\ProjectsV13;Database=foreandr.github.io.database;Trusted_Connection=True;");
                optionsBuilder.UseLazyLoadingProxies(); // Don't know exactly what this does
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
