CREATE TABLE [dbo].[Departments]
(
[DepartmentID] [int] NOT NULL IDENTITY(1, 1),
[DepartmentName] [nvarchar] (150) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[StreetAddress] [nvarchar] (100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[City] [nvarchar] (60) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[Province] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[PostalCode] [char] (6) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[MaxWorkstations] [int] NOT NULL CONSTRAINT [DF_Departments_MaxWorkstations] DEFAULT ((1))
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Departments] ADD CONSTRAINT [CK_Departments_MaxWorkstations] CHECK (([MaxWorkstations]>=(0)))
GO
ALTER TABLE [dbo].[Departments] ADD CONSTRAINT [PK_Department] PRIMARY KEY CLUSTERED ([DepartmentID]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Departments] ADD CONSTRAINT [AK_Departments_DepartmentName] UNIQUE NONCLUSTERED ([DepartmentName]) ON [PRIMARY]
GO
